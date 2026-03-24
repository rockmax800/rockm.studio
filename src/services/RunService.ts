// UC-03 Start Run
// UC-16 Retry Run
// Hardened with:
// - Double run prevention
// - Retry idempotency
// - Serializable isolation
// - Handoff acknowledgement validation (PART 9)
// - Delivery Spine workspace creation (PART 10)

import { GuardError } from "@/guards/GuardError";
import { DeliverySpineService } from "@/services/DeliverySpineService";

interface PrismaTransactionClient {
  [key: string]: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    updateMany: (args: any) => Promise<{ count: number }>;
    create: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>, options?: any) => Promise<T>;
  [key: string]: any;
}

interface OrchestrationServiceLike {
  transitionEntity: (params: {
    entityType: string;
    entityId: string;
    toState: string;
    actorType: string;
    actorRoleId?: string | null;
    projectId: string;
    metadata?: Record<string, unknown>;
    guardContext?: Record<string, unknown>;
  }) => Promise<any>;
}

const ACTIVE_RUN_STATES = ["created", "preparing", "running"] as const;

export class RunService {
  private prisma: PrismaLike;
  private orchestration: OrchestrationServiceLike;
  private deliverySpine: DeliverySpineService;

  constructor(prisma: PrismaLike, orchestrationService: OrchestrationServiceLike) {
    this.prisma = prisma;
    this.orchestration = orchestrationService;
    this.deliverySpine = new DeliverySpineService(prisma);
  }

  async startRun({
    taskId,
    actorType,
  }: {
    taskId: string;
    actorType: "system" | "agent_role";
  }) {
    const { run, task } = await this.prisma.$transaction(async (tx) => {
      const task = await tx.tasks.findUniqueOrThrow({ where: { id: taskId } });
      const project = await tx.projects.findUniqueOrThrow({ where: { id: task.project_id } });

      if (task.state !== "assigned") {
        throw new GuardError({
          message: `Task must be in "assigned" state to start a run. Current: "${task.state}"`,
          entityType: "task",
          entityId: taskId,
          fromState: task.state,
          toState: "in_progress",
        });
      }

      if (project.state !== "active") {
        throw new GuardError({
          message: `Project must be "active". Current: "${project.state}"`,
          entityType: "project",
          entityId: project.id,
          fromState: project.state,
          toState: "active",
        });
      }

      if (!task.owner_role_id) {
        throw new GuardError({
          message: "Task must have an owner_role_id before starting a run",
          entityType: "task",
          entityId: taskId,
          fromState: task.state,
          toState: "in_progress",
        });
      }

      // PART 2 — Prevent double run start
      const activeRunCount = await tx.runs.count({
        where: {
          task_id: taskId,
          state: { in: [...ACTIVE_RUN_STATES] },
        },
      });
      if (activeRunCount > 0) {
        throw new GuardError({
          message: `Run already active for task "${taskId}". Cannot start another run while one is in progress.`,
          entityType: "run",
          entityId: taskId,
          fromState: "none",
          toState: "created",
        });
      }

      const contextPack = await tx.context_packs.findFirst({ where: { task_id: taskId } });
      if (!contextPack) {
        throw new GuardError({
          message: "ContextPack must exist for the task. No waiver allowed.",
          entityType: "run",
          entityId: taskId,
          fromState: "none",
          toState: "created",
        });
      }

      // PART 9 — Validate acknowledged handoff exists
      const activeHandoff = await tx.handoffs?.findFirst({
        where: {
          task_id: taskId,
          status: "acknowledged",
        },
        orderBy: { created_at: "desc" },
      });
      if (!activeHandoff) {
        throw new GuardError({
          message: "Task must have an active acknowledged handoff before starting a run. Target role must acknowledge handoff first.",
          entityType: "run",
          entityId: taskId,
          fromState: "none",
          toState: "created",
        });
      }

      const existingRunCount = await tx.runs.count({ where: { task_id: taskId } });
      const now = new Date().toISOString();

      const run = await tx.runs.create({
        data: {
          project_id: task.project_id,
          task_id: taskId,
          agent_role_id: task.owner_role_id,
          context_pack_id: contextPack.id,
          state: "created",
          run_number: existingRunCount + 1,
          created_at: now,
          updated_at: now,
        },
      });

      return { run, task };
    }, { isolationLevel: "Serializable" });

    // Transition Run: created → preparing
    await this.orchestration.transitionEntity({
      entityType: "run",
      entityId: run.id,
      toState: "preparing",
      actorType,
      actorRoleId: task.owner_role_id,
      projectId: task.project_id,
      metadata: { use_case: "UC-03", trigger: "run started", run_number: run.run_number },
    });

    // Transition Task: assigned → in_progress
    await this.orchestration.transitionEntity({
      entityType: "task",
      entityId: taskId,
      toState: "in_progress",
      actorType,
      actorRoleId: task.owner_role_id,
      projectId: task.project_id,
      metadata: { use_case: "UC-03", trigger: "run started for task", run_id: run.id },
    });

    // PART 10 — Create RepoWorkspace for code-producing domains
    const CODE_DOMAINS = ["frontend_delivery", "backend_delivery", "frontend", "backend"];
    if (task.domain && CODE_DOMAINS.includes(task.domain)) {
      try {
        const repo = await this.deliverySpine.findProjectRepository(task.project_id);
        if (repo) {
          await this.deliverySpine.createWorkspace({
            projectId: task.project_id,
            taskId: taskId,
            runId: run.id,
            repositoryId: repo.id,
            branchName: `task/${taskId.slice(0, 8)}/run-${run.run_number}`,
          });
        }
      } catch {
        // Best-effort workspace creation — run proceeds without it
      }
    }

    // Enqueue execution
    await this.enqueueRunExecution(run.id);

    return run;
  }

  async retryRun(runId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const originalRun = await tx.runs.findUniqueOrThrow({ where: { id: runId } });

      if (!["failed", "timed_out"].includes(originalRun.state)) {
        throw new GuardError({
          message: `Run must be in "failed" or "timed_out" to retry. Current: "${originalRun.state}"`,
          entityType: "run",
          entityId: runId,
          fromState: originalRun.state,
          toState: "superseded",
        });
      }

      // PART 5 — Idempotent retry: if already superseded, return existing retry run
      if (originalRun.superseded_by_run_id) {
        const existingRetry = await tx.runs.findUnique({
          where: { id: originalRun.superseded_by_run_id },
        });
        if (existingRetry) {
          return { originalRun, newRun: existingRetry, alreadyRetried: true };
        }
      }

      // PART 2 — Prevent double run on same task
      const activeRunCount = await tx.runs.count({
        where: {
          task_id: originalRun.task_id,
          state: { in: [...ACTIVE_RUN_STATES] },
        },
      });
      if (activeRunCount > 0) {
        throw new GuardError({
          message: `Run already active for task. Cannot retry while another run is in progress.`,
          entityType: "run",
          entityId: runId,
          fromState: originalRun.state,
          toState: "superseded",
        });
      }

      const existingRunCount = await tx.runs.count({ where: { task_id: originalRun.task_id } });
      const now = new Date().toISOString();

      const contextPack = await tx.context_packs.findFirst({ where: { task_id: originalRun.task_id } });

      const newRun = await tx.runs.create({
        data: {
          project_id: originalRun.project_id,
          task_id: originalRun.task_id,
          agent_role_id: originalRun.agent_role_id,
          context_pack_id: contextPack?.id ?? null,
          state: "created",
          run_number: existingRunCount + 1,
          retry_of_run_id: originalRun.id,
          created_at: now,
          updated_at: now,
        },
      });

      // Link original to new
      await tx.runs.update({
        where: { id: runId },
        data: { superseded_by_run_id: newRun.id, updated_at: now },
      });

      return { originalRun, newRun, alreadyRetried: false };
    }, { isolationLevel: "Serializable" });

    // If already retried, return existing without re-transitioning
    if (result.alreadyRetried) {
      return result.newRun;
    }

    const { originalRun, newRun } = result;

    // Transition original run → superseded
    await this.orchestration.transitionEntity({
      entityType: "run",
      entityId: runId,
      toState: "superseded",
      actorType: "system",
      actorRoleId: originalRun.agent_role_id,
      projectId: originalRun.project_id,
      metadata: {
        use_case: "UC-16",
        trigger: "retry launched",
        replacement_run_id: newRun.id,
      },
    });

    // Transition new run: created → preparing
    await this.orchestration.transitionEntity({
      entityType: "run",
      entityId: newRun.id,
      toState: "preparing",
      actorType: "system",
      actorRoleId: newRun.agent_role_id,
      projectId: newRun.project_id,
      metadata: {
        use_case: "UC-16",
        trigger: "retry run created",
        retry_of_run_id: runId,
        run_number: newRun.run_number,
      },
    });

    // Enqueue execution
    await this.enqueueRunExecution(newRun.id);

    return newRun;
  }

  private async enqueueRunExecution(runId: string) {
    const { executeRun } = await import("@/workers/runExecutor");
    await executeRun(runId, this.prisma, this.orchestration);
  }
}

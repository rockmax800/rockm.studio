// UC-03 Start Run
// Requires:
// - Task in assigned
// - Project active
// - ContextPack exists
// Transitions:
// Run: created → preparing
// Task: assigned → in_progress

import { GuardError } from "@/guards/GuardError";

interface PrismaTransactionClient {
  [key: string]: {
    findUniqueOrThrow: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
}

interface PrismaLike {
  $transaction: <T>(fn: (tx: PrismaTransactionClient) => Promise<T>) => Promise<T>;
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

export class RunService {
  private prisma: PrismaLike;
  private orchestration: OrchestrationServiceLike;

  constructor(prisma: PrismaLike, orchestrationService: OrchestrationServiceLike) {
    this.prisma = prisma;
    this.orchestration = orchestrationService;
  }

  async startRun({
    taskId,
    actorType,
  }: {
    taskId: string;
    actorType: "system" | "agent_role";
  }) {
    const { run, task } = await this.prisma.$transaction(async (tx) => {
      // 1. Load task
      const task = await tx.tasks.findUniqueOrThrow({
        where: { id: taskId },
      });

      // 2. Load project
      const project = await tx.projects.findUniqueOrThrow({
        where: { id: task.project_id },
      });

      // 3. Validate task state
      if (task.state !== "assigned") {
        throw new GuardError({
          message: `Task must be in "assigned" state to start a run. Current state: "${task.state}"`,
          entityType: "task",
          entityId: taskId,
          fromState: task.state,
          toState: "in_progress",
        });
      }

      // 4. Validate project state
      if (project.state !== "active") {
        throw new GuardError({
          message: `Project must be in "active" state. Current state: "${project.state}"`,
          entityType: "project",
          entityId: project.id,
          fromState: project.state,
          toState: "active",
        });
      }

      // 5. Validate owner role exists
      if (!task.owner_role_id) {
        throw new GuardError({
          message: "Task must have an owner_role_id before starting a run",
          entityType: "task",
          entityId: taskId,
          fromState: task.state,
          toState: "in_progress",
        });
      }

      // 6. Validate ContextPack exists
      const contextPack = await tx.context_packs.findFirst({
        where: { task_id: taskId },
      });

      if (!contextPack) {
        throw new GuardError({
          message: "ContextPack must exist for the task before starting a run. No waiver allowed.",
          entityType: "run",
          entityId: taskId,
          fromState: "none",
          toState: "created",
        });
      }

      // 7. Determine next run_number
      const existingRunCount = await tx.runs.count({
        where: { task_id: taskId },
      });
      const runNumber = existingRunCount + 1;

      // 8. Create Run record in initial state
      const now = new Date().toISOString();
      const run = await tx.runs.create({
        data: {
          project_id: task.project_id,
          task_id: taskId,
          agent_role_id: task.owner_role_id,
          context_pack_id: contextPack.id,
          state: "created",
          run_number: runNumber,
          created_at: now,
          updated_at: now,
        },
      });

      return { run, task };
    });

    // 9. Transition Run: created → preparing
    await this.orchestration.transitionEntity({
      entityType: "run",
      entityId: run.id,
      toState: "preparing",
      actorType,
      actorRoleId: task.owner_role_id,
      projectId: task.project_id,
      metadata: {
        use_case: "UC-03",
        trigger: "run started",
        run_number: run.run_number,
        task_id: taskId,
      },
    });

    // 10. Transition Task: assigned → in_progress
    await this.orchestration.transitionEntity({
      entityType: "task",
      entityId: taskId,
      toState: "in_progress",
      actorType,
      actorRoleId: task.owner_role_id,
      projectId: task.project_id,
      metadata: {
        use_case: "UC-03",
        trigger: "run started for task",
        run_id: run.id,
        run_number: run.run_number,
      },
    });

    return run;
  }
}

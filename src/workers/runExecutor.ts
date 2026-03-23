// Worker Run Executor (Mock V1)
// Later will integrate ProviderService in place of mock artifact creation.

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

export async function executeRun(
  runId: string,
  prisma: PrismaLike,
  orchestration: OrchestrationServiceLike,
) {
  let run: any;
  let task: any;

  try {
    // 1. Load run with related task and project
    const loaded = await prisma.$transaction(async (tx) => {
      const run = await tx.runs.findUniqueOrThrow({
        where: { id: runId },
      });

      const task = await tx.tasks.findUniqueOrThrow({
        where: { id: run.task_id },
      });

      const project = await tx.projects.findUniqueOrThrow({
        where: { id: run.project_id },
      });

      return { run, task, project };
    });

    run = loaded.run;
    task = loaded.task;

    // 2. Validate run is in preparing state
    if (run.state !== "preparing") {
      throw new GuardError({
        message: `Run must be in "preparing" state to execute. Current state: "${run.state}"`,
        entityType: "run",
        entityId: runId,
        fromState: run.state,
        toState: "running",
      });
    }

    // 3. Transition run: preparing → running
    await orchestration.transitionEntity({
      entityType: "run",
      entityId: runId,
      toState: "running",
      actorType: "system",
      actorRoleId: run.agent_role_id,
      projectId: run.project_id,
      metadata: {
        use_case: "UC-03",
        phase: "run_executor",
        trigger: "execution started",
        run_number: run.run_number,
      },
    });

    // 4. Mock execution — create artifact
    const now = new Date().toISOString();
    await prisma.$transaction(async (tx) => {
      await tx.artifacts.create({
        data: {
          project_id: run.project_id,
          task_id: run.task_id,
          run_id: runId,
          artifact_type: "document",
          title: "Mock Output",
          state: "created",
          storage_kind: "db_text",
          content_text: "Mock generated content",
          created_at: now,
          updated_at: now,
        },
      });
    });

    // 5. Transition run: running → produced_output
    await orchestration.transitionEntity({
      entityType: "run",
      entityId: runId,
      toState: "produced_output",
      actorType: "system",
      actorRoleId: run.agent_role_id,
      projectId: run.project_id,
      metadata: {
        use_case: "UC-04",
        phase: "run_executor",
        trigger: "execution completed (mock)",
        run_number: run.run_number,
        artifacts_created: 1,
      },
    });

    return { success: true, runId };
  } catch (error) {
    // On any failure: transition run → failed and store reason
    if (run) {
      try {
        const failureReason =
          error instanceof Error ? error.message : "Unknown execution error";

        // Store failure_reason on run record
        await prisma.$transaction(async (tx) => {
          await tx.runs.update({
            where: { id: runId },
            data: {
              failure_reason: failureReason,
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          });
        });

        // Transition run → failed via orchestration
        await orchestration.transitionEntity({
          entityType: "run",
          entityId: runId,
          toState: "failed",
          actorType: "system",
          actorRoleId: run.agent_role_id,
          projectId: run.project_id,
          metadata: {
            use_case: "UC-14",
            phase: "run_executor",
            trigger: "execution failed",
            failure_reason: failureReason,
            run_number: run.run_number,
          },
        });
      } catch (transitionError) {
        // If even failure transition fails, log but don't mask original error
        console.error("Failed to transition run to failed state:", transitionError);
      }
    }

    throw error;
  }
}

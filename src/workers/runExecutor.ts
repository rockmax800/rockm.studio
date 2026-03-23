// Worker Run Executor
// UC-03 → UC-13 → UC-04 / UC-14
// Loads run, calls ProviderService, creates artifact, transitions state.
// All state changes via OrchestrationService.

import { GuardError } from "@/guards/GuardError";
import { ProviderService } from "@/services/ProviderService";

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
  let run: any = null;

  try {
    // 1. Load run + task + project + contextPack
    const loaded = await prisma.$transaction(async (tx) => {
      const run = await tx.runs.findUniqueOrThrow({ where: { id: runId } });
      const task = await tx.tasks.findUniqueOrThrow({ where: { id: run.task_id } });
      const project = await tx.projects.findUniqueOrThrow({ where: { id: run.project_id } });
      const contextPack = run.context_pack_id
        ? await tx.context_packs.findUniqueOrThrow({ where: { id: run.context_pack_id } })
        : null;

      return { run, task, project, contextPack };
    });

    run = loaded.run;
    const { task, contextPack } = loaded;

    // 2. Validate run state
    if (run.state !== "preparing") {
      throw new GuardError({
        message: `Run must be in "preparing" state to execute. Current: "${run.state}"`,
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
        use_case: "UC-13",
        phase: "run_executor",
        trigger: "execution started",
        run_number: run.run_number,
      },
    });

    // 4. Call ProviderService
    const providerService = new ProviderService(prisma);
    const providerResult = await providerService.execute({ run, task, contextPack });

    // 5. Create Artifact from provider output
    const now = new Date().toISOString();
    await prisma.$transaction(async (tx) => {
      await tx.artifacts.create({
        data: {
          project_id: run.project_id,
          task_id: run.task_id,
          run_id: runId,
          artifact_type: "document",
          title: "Provider Output",
          state: "created",
          storage_kind: "db_text",
          content_text: providerResult.outputText,
          summary: `Output from provider ${providerResult.providerId} model ${providerResult.modelId}`,
          created_at: now,
          updated_at: now,
        },
      });

      // Store output summary on run
      await tx.runs.update({
        where: { id: runId },
        data: {
          output_summary: providerResult.outputText.slice(0, 500),
          ended_at: now,
          updated_at: now,
        },
      });
    });

    // 6. Transition run: running → produced_output
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
        trigger: "execution completed",
        run_number: run.run_number,
        provider_id: providerResult.providerId,
        model_id: providerResult.modelId,
      },
    });

    return { success: true, runId };
  } catch (error) {
    // UC-14: Handle Run Failure
    if (run) {
      try {
        const failureReason = error instanceof Error ? error.message : "Unknown execution error";

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
        console.error("Failed to transition run to failed state:", transitionError);
      }
    }

    throw error;
  }
}

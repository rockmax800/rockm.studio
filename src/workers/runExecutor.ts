// Worker Run Executor
// UC-03 → UC-13 → UC-04 / UC-14
// Extended with: Dual Verification flagging (PART 1), Self-Review (PART 2),
// Context Compression (PART 4), Auto-Retry (PART 6)

import { GuardError } from "@/guards/GuardError";
import { ProviderService } from "@/services/ProviderService";
import { SelfReviewService } from "@/services/SelfReviewService";
import { ContextCompressionService } from "@/services/ContextCompressionService";
import { RetryPolicyService } from "@/services/RetryPolicyService";
import { OfficeEventEmitter } from "@/services/OfficeEventEmitter";
import { logInfo } from "@/lib/logger";

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

    // 4. Call ProviderService (includes dual verification & adaptive routing)
    const providerService = new ProviderService(prisma);
    const providerResult = await providerService.execute({ run, task, contextPack });

    // 5. Create Artifact from provider output
    const now = new Date().toISOString();
    let artifactId: string | null = null;
    await prisma.$transaction(async (tx) => {
      const artifact = await tx.artifacts.create({
        data: {
          project_id: run.project_id,
          task_id: run.task_id,
          run_id: runId,
          artifact_type: "document",
          title: "Provider Output",
          state: "created",
          storage_kind: "db_text",
          content_text: providerResult.outputText,
          summary: `Output from provider ${providerResult.providerId} model ${providerResult.modelId}${providerResult.adaptiveRoutingUsed ? " (adaptive routing)" : ""}${providerResult.dualVerification ? ` [verification: ${providerResult.dualVerification.risk_level}]` : ""}`,
          created_at: now,
          updated_at: now,
        },
      });
      artifactId = artifact.id;

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

    // PART 2 — Self-Review before human review (SKIPPED in production mode)
    if (artifactId) {
      try {
        const { isFeatureEnabled } = await import("@/services/SystemModeService");
        const selfReviewEnabled = await isFeatureEnabled("enable_self_review");
        if (selfReviewEnabled) {
          const selfReviewService = new SelfReviewService(prisma);
          await selfReviewService.selfReview({
            artifactId,
            providerService,
            providerCode: "openai",
            modelCode: "gpt-4",
          });
        }
      } catch { /* best-effort */ }
    }

    // 6. Transition run: running → produced_output
    const transitionMetadata: Record<string, unknown> = {
      use_case: "UC-04",
      phase: "run_executor",
      trigger: "execution completed",
      run_number: run.run_number,
      provider_id: providerResult.providerId,
      model_id: providerResult.modelId,
      adaptive_routing_used: providerResult.adaptiveRoutingUsed ?? false,
    };

    // PART 1 — If dual verification returned high risk, add metadata for mandatory review flagging
    if (providerResult.dualVerification) {
      transitionMetadata.dual_verification = providerResult.dualVerification;
      if (providerResult.dualVerification.risk_level === "high") {
        transitionMetadata.mandatory_review = true;
        logInfo("dual_verification_high_risk", { runId, notes: providerResult.dualVerification.notes });
      }
    }

    await orchestration.transitionEntity({
      entityType: "run",
      entityId: runId,
      toState: "produced_output",
      actorType: "system",
      actorRoleId: run.agent_role_id,
      projectId: run.project_id,
      metadata: transitionMetadata,
    });

    return { success: true, runId };
  } catch (error) {
    // UC-14: Handle Run Failure
    if (run) {
      try {
        const failureReason = error instanceof Error ? error.message : "Unknown execution error";
        const isTimeout = error instanceof Error && error.message.toLowerCase().includes("timed out");

        await prisma.$transaction(async (tx) => {
          await tx.runs.update({
            where: { id: runId },
            data: {
              failure_reason: isTimeout ? `provider_timeout: ${failureReason}` : failureReason,
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          });
        });

        await orchestration.transitionEntity({
          entityType: "run",
          entityId: runId,
          toState: isTimeout ? "timed_out" : "failed",
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

        // PART 6 — Auto-retry evaluation (after failure transition)
        try {
          // Lazy-import RunService to avoid circular dependency
          const { RunService } = await import("@/services/RunService");
          const runService = new RunService(prisma, orchestration);
          const officeEmitter = new OfficeEventEmitter(prisma);
          const retryPolicy = new RetryPolicyService(prisma, runService, officeEmitter);
          const retryResult = await retryPolicy.evaluateAndRetry(runId);
          if (retryResult.retried) {
            logInfo("auto_retry_succeeded", { originalRunId: runId, newRunId: retryResult.newRunId });
          }
        } catch {
          // Auto-retry is best-effort — do not mask original error
        }
      } catch (transitionError) {
        console.error("Failed to transition run to failed state:", transitionError);
      }
    }

    throw error;
  }
}

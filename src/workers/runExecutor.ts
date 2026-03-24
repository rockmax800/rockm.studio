// Worker Run Executor
// UC-03 → UC-13 → UC-04 / UC-14
// Extended with: Dual Verification flagging (PART 1), Self-Review (PART 2),
// Context Compression (PART 4), Auto-Retry (PART 6),
// Sandbox Execution Isolation (PART 13)

import { GuardError } from "@/guards/GuardError";
import { ProviderService } from "@/services/ProviderService";
import { SelfReviewService } from "@/services/SelfReviewService";
import { ContextCompressionService } from "@/services/ContextCompressionService";
import { RetryPolicyService } from "@/services/RetryPolicyService";
import { OfficeEventEmitter } from "@/services/OfficeEventEmitter";
import { SandboxExecutorService } from "@/services/SandboxExecutorService";
import { RoleContractEnforcementService } from "@/services/RoleContractEnforcementService";
import { logInfo } from "@/lib/logger";

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
        correlation_id: run.correlation_id,
      },
    });

    // PART 12 — Acquire lease and set heartbeat at execution start
    const executionStart = new Date().toISOString();
    const leaseOwner = `executor:${runId.slice(0, 8)}`;
    const leaseDurationMs = 10 * 60 * 1000; // 10 minutes
    const leaseExpiresAt = new Date(Date.now() + leaseDurationMs).toISOString();

    const leaseAcquired = await prisma.$transaction(async (tx) => {
      const current = await tx.runs.findUniqueOrThrow({ where: { id: runId } });

      // Check if lease is already held and not expired
      if (current.lease_owner && current.lease_expires_at) {
        const expiresAt = new Date(current.lease_expires_at).getTime();
        if (expiresAt > Date.now()) {
          // Lease is active and not expired — abort
          return false;
        }
      }

      await tx.runs.update({
        where: { id: runId },
        data: {
          heartbeat_at: executionStart,
          lease_owner: leaseOwner,
          lease_acquired_at: executionStart,
          lease_expires_at: leaseExpiresAt,
          started_at: executionStart,
          updated_at: executionStart,
        },
      });
      return true;
    });

    if (!leaseAcquired) {
      throw new GuardError({
        message: `Cannot acquire lease for run "${runId}" — lease is held by another executor`,
        entityType: "run",
        entityId: runId,
        fromState: "running",
        toState: "running",
      });
    }

    // PART 14 — Role Contract pre-execution enforcement
    const contractEnforcement = new RoleContractEnforcementService(prisma);
    let roleContract: any = null;
    let taskSpecForRun: any = null;

    if (run.agent_role_id && task.domain) {
      try {
        const enforcement = await contractEnforcement.enforcePreExecution({
          runId,
          roleId: run.agent_role_id,
          taskId: run.task_id,
          taskDomain: task.domain,
        });
        roleContract = enforcement.contract;
        taskSpecForRun = enforcement.taskSpec;
      } catch (e) {
        if (e instanceof GuardError) throw e;
        // Best-effort — do not block execution if contract lookup fails
      }
    }

    // PART 13 — Resolve sandbox policy for isolated execution
    const sandboxExecutor = new SandboxExecutorService(prisma);
    const sandboxPolicy = await sandboxExecutor.resolvePolicy(runId);

    logInfo("sandbox_policy_resolved", {
      runId,
      policyName: sandboxPolicy.name,
      cpuLimit: sandboxPolicy.cpu_limit,
      memoryLimitMb: sandboxPolicy.memory_limit_mb,
      timeoutSeconds: sandboxPolicy.timeout_seconds,
      networkAllowed: sandboxPolicy.allowed_network,
    });

    // If run has a workspace, validate its path and prepare sandbox execution
    let sandboxResult = null;
    try {
      const workspace = await prisma.repo_workspaces?.findFirst({ where: { run_id: runId } });
      if (workspace?.worktree_path) {
        sandboxExecutor.validateWorktreePath(workspace.worktree_path, workspace.id);

        // Generate sandbox command for traceability (actual execution via ProviderService)
        const dockerCmd = sandboxExecutor.generateDockerCommand(sandboxPolicy, {
          runId,
          workspaceId: workspace.id,
          worktreePath: workspace.worktree_path,
          dockerImage: "ai-studio/runner:latest",
          command: ["node", "run.js"],
        });

        logInfo("sandbox_docker_command_generated", {
          runId,
          workspaceId: workspace.id,
          commandPreview: dockerCmd.slice(0, 5).join(" ") + " ...",
        });
      }
    } catch { /* best-effort sandbox prep — run still executes via provider */ }

    // 4. Call ProviderService (includes dual verification & adaptive routing)
    const providerService = new ProviderService(prisma);
    const providerResult = await providerService.execute({ run, task, contextPack });

    // 5. Create Artifact from provider output
    const now = new Date().toISOString();
    let artifactId: string | null = null;
    await prisma.$transaction(async (tx) => {
      // Determine artifact category based on task domain
      const CODE_DOMAINS = ["frontend_delivery", "backend_delivery", "frontend", "backend"];
      const isCodeTask = task.domain && CODE_DOMAINS.includes(task.domain);
      const artifactCategory = isCodeTask ? "implementation_patch" : "technical_plan";

      // Look up workspace for evidence linking
      let workspaceId: string | null = null;
      try {
        const ws = await tx.repo_workspaces?.findFirst({ where: { run_id: runId } });
        if (ws) workspaceId = ws.id;
      } catch { /* best-effort */ }

      const artifact = await tx.artifacts.create({
        data: {
          project_id: run.project_id,
          task_id: run.task_id,
          run_id: runId,
          artifact_type: "document",
          artifact_category: artifactCategory,
          source_entity_type: "run",
          source_entity_id: runId,
          related_repo_workspace_id: workspaceId,
          changed_files_json: providerResult.changedFiles ?? null,
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

      // PART 14b — Post-execution path validation against role contract
      if (providerResult.changedFiles && (roleContract || taskSpecForRun)) {
        const pathResult = contractEnforcement.validateChangedFiles(
          providerResult.changedFiles,
          roleContract,
          taskSpecForRun,
        );
        if (!pathResult.valid) {
          logInfo("role_contract_path_violations_detected", {
            runId,
            violations: pathResult.violations,
          });
          // Record violations in artifact summary for reviewer visibility
          providerResult.outputText += `\n\n⚠️ ROLE CONTRACT VIOLATIONS:\n${pathResult.violations.join("\n")}`;
        }
      }

      // PART 11 — Store execution trace: provider refs, tokens, cost, workspace link
      const updateData: Record<string, unknown> = {
        output_summary: providerResult.outputText.slice(0, 500),
        ended_at: now,
        updated_at: now,
        provider_id: providerResult.providerId ?? null,
        provider_model_id: providerResult.modelId ?? null,
        input_tokens: providerResult.inputTokens ?? null,
        output_tokens: providerResult.outputTokens ?? null,
        estimated_cost: providerResult.estimatedCost ?? null,
        logs_ref: `runs/${runId}/logs`,
        heartbeat_at: now,
        duration_ms: run.started_at
          ? new Date(now).getTime() - new Date(run.started_at).getTime()
          : null,
      };

      // Link workspace if one exists for this run
      try {
        const workspace = await tx.repo_workspaces?.findFirst({ where: { run_id: runId } });
        if (workspace) {
          updateData.workspace_id = workspace.id;
          updateData.branch_name = workspace.branch_name;
        }
      } catch { /* best-effort */ }

      await tx.runs.update({
        where: { id: runId },
        data: updateData,
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
          const errorClassName = error instanceof GuardError ? "guard_error"
            : error instanceof Error && error.message.toLowerCase().includes("timed out") ? "timeout"
            : error instanceof Error ? error.constructor.name
            : "unknown";

          await tx.runs.update({
            where: { id: runId },
            data: {
              failure_reason: isTimeout ? `provider_timeout: ${failureReason}` : failureReason,
              error_class: errorClassName,
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              duration_ms: run.started_at
                ? new Date().getTime() - new Date(run.started_at).getTime()
                : null,
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
            correlation_id: run.correlation_id,
          },
        });

        // PART 6 — Auto-retry evaluation (after failure transition, skipped in production)
        try {
          const { isProduction: isProd } = await import("@/services/SystemModeService");
          if (!(await isProd())) {
            const { RunService } = await import("@/services/RunService");
            const runService = new RunService(prisma, orchestration);
            const officeEmitter = new OfficeEventEmitter(prisma);
            const retryPolicy = new RetryPolicyService(prisma, runService, officeEmitter);
            const retryResult = await retryPolicy.evaluateAndRetry(runId);
            if (retryResult.retried) {
              logInfo("auto_retry_succeeded", { originalRunId: runId, newRunId: retryResult.newRunId });
            }
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

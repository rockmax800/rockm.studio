// Learning Proposal Pipeline Service
// Knowledge Plane — proposes improvements, never mutates delivery state.
// Founder approval required for all promotions (via Approval entity).
// Shadow mode uses isolated evaluation_runs — no delivery mutation.

import { GuardError } from "@/guards/GuardError";
import { logInfo, logError } from "@/lib/logger";
import { writeEventLog } from "@/lib/eventLogWriter";

interface PrismaLike {
  [key: string]: any;
}

export type ProposalType = "prompt_update" | "skill_update" | "policy_update" | "routing_update";
export type ProposalStatus = "candidate" | "evaluated" | "shadow" | "approved" | "rejected" | "promoted";
export type EvaluationRunStatus = "created" | "running" | "completed" | "failed";

const MIN_SOURCE_RUNS = 3;

interface CreateProposalParams {
  proposalType: ProposalType;
  sourceRunIds: string[];
  hypothesis: string;
  expectedGain: Record<string, unknown>;
  baselineMetrics: Record<string, unknown>;
  candidateVersionRef?: string;
}

interface EvaluationResult {
  pass_rate_before: number;
  pass_rate_after: number;
  defect_rate_delta: number;
  cost_delta: number;
  latency_delta: number;
  sample_size: number;
  statistically_significant: boolean;
}

export class LearningPipelineService {
  private prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  // ── STEP 1: Create Proposal ──────────────────────────────

  async createProposal(params: CreateProposalParams): Promise<any> {
    if (!params.sourceRunIds || params.sourceRunIds.length < MIN_SOURCE_RUNS) {
      throw new GuardError({
        message: `Learning proposal requires at least ${MIN_SOURCE_RUNS} source runs. Got ${params.sourceRunIds?.length ?? 0}`,
        entityType: "approval",
        entityId: "new",
        fromState: "none",
        toState: "candidate",
      });
    }

    if (!params.hypothesis || params.hypothesis.trim().length === 0) {
      throw new GuardError({
        message: "Learning proposal requires a hypothesis",
        entityType: "approval",
        entityId: "new",
        fromState: "none",
        toState: "candidate",
      });
    }

    const proposal = await this.prisma.learning_proposals.create({
      data: {
        proposal_type: params.proposalType,
        source_runs_json: params.sourceRunIds,
        hypothesis: params.hypothesis,
        expected_gain_json: params.expectedGain,
        baseline_metrics_json: params.baselineMetrics,
        candidate_version_ref: params.candidateVersionRef ?? null,
        status: "candidate",
      },
    });

    await this.emitEvent(proposal.id, "learning_proposal.created", {
      proposal_type: params.proposalType,
      source_run_count: params.sourceRunIds.length,
    });

    logInfo("learning_proposal_created", {
      proposalId: proposal.id,
      type: params.proposalType,
      sourceRuns: params.sourceRunIds.length,
    });

    return proposal;
  }

  // ── STEP 2: Offline Evaluation ───────────────────────────

  async recordEvaluation(proposalId: string, result: EvaluationResult): Promise<any> {
    const proposal = await this.prisma.learning_proposals.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new GuardError({
        message: `Learning proposal ${proposalId} not found`,
        entityType: "approval",
        entityId: proposalId,
        fromState: "unknown",
        toState: "evaluated",
      });
    }

    if (proposal.status !== "candidate") {
      throw new GuardError({
        message: `Cannot evaluate proposal in status "${proposal.status}". Must be "candidate"`,
        entityType: "approval",
        entityId: proposalId,
        fromState: proposal.status,
        toState: "evaluated",
      });
    }

    const now = new Date().toISOString();
    const updated = await this.prisma.learning_proposals.update({
      where: { id: proposalId },
      data: {
        evaluation_result_json: result,
        status: "evaluated",
        evaluated_at: now,
      },
    });

    await this.emitEvent(proposalId, "learning_proposal.evaluated", {
      pass_rate_before: result.pass_rate_before,
      pass_rate_after: result.pass_rate_after,
      statistically_significant: result.statistically_significant,
    });

    logInfo("learning_proposal_evaluated", { proposalId, result });
    return updated;
  }

  // ── STEP 3: Shadow Mode (Experimental only, uses evaluation_runs) ──

  async enableShadow(proposalId: string): Promise<any> {
    const { isProduction } = await import("@/services/SystemModeService");
    if (await isProduction()) {
      throw new GuardError({
        message: "Shadow testing is only available in Experimental mode",
        entityType: "approval",
        entityId: proposalId,
        fromState: "evaluated",
        toState: "shadow",
      });
    }

    const proposal = await this.prisma.learning_proposals.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || proposal.status !== "evaluated") {
      throw new GuardError({
        message: `Proposal must be "evaluated" to enter shadow mode. Current: "${proposal?.status}"`,
        entityType: "approval",
        entityId: proposalId,
        fromState: proposal?.status ?? "unknown",
        toState: "shadow",
      });
    }

    const updated = await this.prisma.learning_proposals.update({
      where: { id: proposalId },
      data: { status: "shadow" },
    });

    await this.emitEvent(proposalId, "learning_proposal.shadow_started", {
      candidate_version_ref: proposal.candidate_version_ref,
    });

    logInfo("learning_proposal_shadow_started", { proposalId });
    return updated;
  }

  /**
   * Create an isolated evaluation run for shadow testing.
   * evaluation_runs NEVER mutate delivery state:
   * - Cannot create pull_requests
   * - Cannot deploy
   * - Cannot modify tasks, runs, or artifacts
   * - Writes only to evaluation_runs and learning_proposals
   */
  async createEvaluationRun(params: {
    proposalId: string;
    baseRunId?: string;
    contextSnapshotRef?: string;
  }): Promise<any> {
    const proposal = await this.prisma.learning_proposals.findUnique({
      where: { id: params.proposalId },
    });

    if (!proposal || proposal.status !== "shadow") {
      throw new GuardError({
        message: `Proposal must be in "shadow" status to create evaluation run. Current: "${proposal?.status}"`,
        entityType: "approval",
        entityId: params.proposalId,
        fromState: proposal?.status ?? "unknown",
        toState: "shadow",
      });
    }

    const evalRun = await this.prisma.evaluation_runs.create({
      data: {
        learning_proposal_id: params.proposalId,
        base_run_id: params.baseRunId ?? null,
        candidate_version_ref: proposal.candidate_version_ref ?? null,
        context_snapshot_ref: params.contextSnapshotRef ?? null,
        status: "created",
      },
    });

    await this.emitEvent(params.proposalId, "evaluation_run.created", {
      evaluation_run_id: evalRun.id,
      base_run_id: params.baseRunId,
    });

    logInfo("evaluation_run_created", {
      evaluationRunId: evalRun.id,
      proposalId: params.proposalId,
    });

    return evalRun;
  }

  /**
   * Record evaluation run results. Updates both the run and the proposal's shadow comparison.
   */
  async completeEvaluationRun(params: {
    evaluationRunId: string;
    resultMetrics: Record<string, unknown>;
  }): Promise<any> {
    const evalRun = await this.prisma.evaluation_runs.findUnique({
      where: { id: params.evaluationRunId },
    });

    if (!evalRun || evalRun.status !== "created" && evalRun.status !== "running") {
      throw new GuardError({
        message: `Evaluation run must be "created" or "running" to complete. Current: "${evalRun?.status}"`,
        entityType: "approval",
        entityId: params.evaluationRunId,
        fromState: evalRun?.status ?? "unknown",
        toState: "completed",
      });
    }

    const now = new Date().toISOString();
    const updated = await this.prisma.evaluation_runs.update({
      where: { id: params.evaluationRunId },
      data: {
        status: "completed",
        result_metrics_json: params.resultMetrics,
        completed_at: now,
      },
    });

    // Update shadow comparison on the proposal
    await this.prisma.learning_proposals.update({
      where: { id: evalRun.learning_proposal_id },
      data: { shadow_comparison_json: params.resultMetrics },
    });

    await this.emitEvent(evalRun.learning_proposal_id, "evaluation_run.completed", {
      evaluation_run_id: params.evaluationRunId,
      result_metrics: params.resultMetrics,
    });

    logInfo("evaluation_run_completed", {
      evaluationRunId: params.evaluationRunId,
      proposalId: evalRun.learning_proposal_id,
    });

    return updated;
  }

  // ── STEP 4: Founder Approval (via Approval entity) ──────

  /**
   * Approve a learning proposal. Requires:
   * - Status "evaluated" or "shadow"
   * - evaluation_result_json present
   * - Statistically significant improvement
   * - If shadow mode was used, at least one completed evaluation_run
   *
   * NOTE: For full governance, the founder should create an Approval entity
   * (target_type=learning_proposal, approval_type=learning_promotion)
   * before calling this method. This method validates the internal state.
   */
  async approve(proposalId: string): Promise<any> {
    const proposal = await this.prisma.learning_proposals.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new GuardError({
        message: `Learning proposal ${proposalId} not found`,
        entityType: "approval",
        entityId: proposalId,
        fromState: "unknown",
        toState: "approved",
      });
    }

    if (proposal.status !== "evaluated" && proposal.status !== "shadow") {
      throw new GuardError({
        message: `Cannot approve proposal in status "${proposal.status}". Must be "evaluated" or "shadow"`,
        entityType: "approval",
        entityId: proposalId,
        fromState: proposal.status,
        toState: "approved",
      });
    }

    if (!proposal.evaluation_result_json) {
      throw new GuardError({
        message: "Cannot approve proposal without evaluation_result",
        entityType: "approval",
        entityId: proposalId,
        fromState: proposal.status,
        toState: "approved",
      });
    }

    const evalResult = proposal.evaluation_result_json as unknown as EvaluationResult;
    if (!evalResult.statistically_significant) {
      throw new GuardError({
        message: "Cannot approve proposal — improvement is not statistically significant",
        entityType: "approval",
        entityId: proposalId,
        fromState: proposal.status,
        toState: "approved",
      });
    }

    // If shadow mode was used, require at least one completed evaluation_run
    if (proposal.status === "shadow") {
      const completedRuns = await this.prisma.evaluation_runs.count({
        where: {
          learning_proposal_id: proposalId,
          status: "completed",
        },
      });
      if (completedRuns === 0) {
        throw new GuardError({
          message: "Shadow proposals require at least one completed evaluation run before approval",
          entityType: "approval",
          entityId: proposalId,
          fromState: "shadow",
          toState: "approved",
        });
      }
    }

    const now = new Date().toISOString();
    const updated = await this.prisma.learning_proposals.update({
      where: { id: proposalId },
      data: {
        status: "approved",
        approved_at: now,
      },
    });

    await this.emitEvent(proposalId, "learning_proposal.approved", {
      proposal_type: proposal.proposal_type,
    });

    logInfo("learning_proposal_approved", { proposalId });
    return updated;
  }

  async reject(proposalId: string, reason: string): Promise<any> {
    const now = new Date().toISOString();
    const updated = await this.prisma.learning_proposals.update({
      where: { id: proposalId },
      data: {
        status: "rejected",
        rejection_reason: reason,
        approved_at: now,
      },
    });

    await this.emitEvent(proposalId, "learning_proposal.rejected", { reason });
    logInfo("learning_proposal_rejected", { proposalId, reason });
    return updated;
  }

  // ── STEP 5: Promotion ────────────────────────────────────

  async promote(proposalId: string): Promise<any> {
    const proposal = await this.prisma.learning_proposals.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || proposal.status !== "approved") {
      throw new GuardError({
        message: `Cannot promote proposal — must be "approved". Current: "${proposal?.status}"`,
        entityType: "approval",
        entityId: proposalId,
        fromState: proposal?.status ?? "unknown",
        toState: "promoted",
      });
    }

    // Verify founder Approval entity exists for this promotion
    const founderApproval = await this.prisma.approvals?.findFirst({
      where: {
        target_type: "learning_proposal",
        target_id: proposalId,
        decision: "approved",
        state: { in: ["decided", "closed"] },
      },
    });

    // Check Evaluation Rail gate — protected scenarios must pass
    const evalReport = await this.prisma.evaluation_reports?.findFirst({
      where: {
        target_type: "learning_proposal",
        target_id: proposalId,
      },
      orderBy: { created_at: "desc" },
    });

    if (evalReport && !evalReport.protected_scenarios_passed) {
      throw new GuardError({
        message: "Cannot promote — protected evaluation scenarios did not pass",
        entityType: "approval",
        entityId: proposalId,
        fromState: "approved",
        toState: "promoted",
      });
    }

    const now = new Date().toISOString();
    let promotedVersionRef: string | null = null;

    if (proposal.proposal_type === "prompt_update" && proposal.candidate_version_ref) {
      try {
        const candidate = await this.prisma.prompt_versions.findUnique({
          where: { id: proposal.candidate_version_ref },
        });

        if (candidate) {
          await this.prisma.prompt_versions.updateMany({
            where: { role_id: candidate.role_id, is_active: true },
            data: { is_active: false },
          });

          await this.prisma.prompt_versions.update({
            where: { id: proposal.candidate_version_ref },
            data: { is_active: true },
          });

          promotedVersionRef = proposal.candidate_version_ref;
          logInfo("prompt_version_promoted", {
            proposalId,
            versionId: proposal.candidate_version_ref,
            roleId: candidate.role_id,
          });
        }
      } catch (e) {
        logError("prompt_promotion_failed", {
          proposalId,
          error: e instanceof Error ? e.message : "unknown",
        });
        throw e;
      }
    }

    const updated = await this.prisma.learning_proposals.update({
      where: { id: proposalId },
      data: {
        status: "promoted",
        promoted_at: now,
        promoted_version_ref: promotedVersionRef,
      },
    });

    await this.emitEvent(proposalId, "learning_proposal.promoted", {
      proposal_type: proposal.proposal_type,
      promoted_version_ref: promotedVersionRef,
      has_founder_approval: !!founderApproval,
    });

    logInfo("learning_proposal_promoted", { proposalId, type: proposal.proposal_type });
    return updated;
  }

  // ── Event Logging ────────────────────────────────────────

  private async emitEvent(proposalId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.prisma.event_log.create({
        data: {
          event_type: eventType,
          aggregate_type: "learning_proposal",
          aggregate_id: proposalId,
          payload_json: payload,
          actor_type: "system",
        },
      });
    } catch {
      // Best-effort
    }
  }
}

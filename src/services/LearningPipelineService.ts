// Learning Proposal Pipeline Service
// Knowledge Plane — proposes improvements, never mutates delivery state.
// Founder approval required for all promotions.

import { GuardError } from "@/guards/GuardError";
import { logInfo, logError } from "@/lib/logger";

interface PrismaLike {
  [key: string]: any;
}

export type ProposalType = "prompt_update" | "skill_update" | "policy_update" | "routing_update";
export type ProposalStatus = "candidate" | "evaluated" | "shadow" | "approved" | "rejected" | "promoted";

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
    // Evidence requirement: at least 3 source runs
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

    // Write to event_log
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

  // ── STEP 3: Shadow Mode (Experimental only) ─────────────

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

  async recordShadowComparison(proposalId: string, comparison: Record<string, unknown>): Promise<any> {
    return this.prisma.learning_proposals.update({
      where: { id: proposalId },
      data: { shadow_comparison_json: comparison },
    });
  }

  // ── STEP 4: Founder Approval ─────────────────────────────

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

    // Must have evaluation result
    if (!proposal.evaluation_result_json) {
      throw new GuardError({
        message: "Cannot approve proposal without evaluation_result",
        entityType: "approval",
        entityId: proposalId,
        fromState: proposal.status,
        toState: "approved",
      });
    }

    // Must be statistically significant
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

    const now = new Date().toISOString();

    // Execute promotion based on type
    let promotedVersionRef: string | null = null;

    if (proposal.proposal_type === "prompt_update" && proposal.candidate_version_ref) {
      // Activate new prompt version, archive previous
      try {
        const candidate = await this.prisma.prompt_versions.findUnique({
          where: { id: proposal.candidate_version_ref },
        });

        if (candidate) {
          // Deactivate current active version for this role
          await this.prisma.prompt_versions.updateMany({
            where: { role_id: candidate.role_id, is_active: true },
            data: { is_active: false },
          });

          // Activate candidate
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

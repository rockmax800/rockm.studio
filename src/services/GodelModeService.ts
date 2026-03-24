/**
 * Gödel Mode — Formal Self-Modification Service
 *
 * System reasons about its own contracts, prompts, rubrics, guards.
 * Every proposal must include formal justification, constraint preservation proof,
 * pass Evaluation Rail, and receive Founder Approval before promotion.
 *
 * SAFETY: No direct mutation of production rules. All changes go through
 * the proposal → evaluation → approval → promotion pipeline.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CreateSelfModProposalParams {
  targetComponent: "prompt" | "rubric" | "guard" | "contract" | "retrieval_rule" | "trait" | "stack" | "routing";
  targetEntityId?: string;
  currentVersion: string;
  proposedVersion: string;
  formalReasoningSummary: string;
  expectedImprovement: string;
  impactScope: string[];
  safetyFlags: string[];
  constraintPreservationProof?: string;
  requiresEval?: boolean;
}

export class GodelModeService {
  /**
   * Create a new self-modification proposal.
   * Status starts as 'candidate'. Must pass evaluation and founder approval.
   */
  static async createProposal(params: CreateSelfModProposalParams) {
    const { data, error } = await supabase
      .from("self_modification_proposals")
      .insert({
        target_component: params.targetComponent,
        target_entity_id: params.targetEntityId ?? null,
        current_version: params.currentVersion,
        proposed_version: params.proposedVersion,
        formal_reasoning_summary: params.formalReasoningSummary,
        expected_improvement: params.expectedImprovement,
        impact_scope: params.impactScope,
        safety_flags: params.safetyFlags,
        constraint_preservation_proof: params.constraintPreservationProof ?? null,
        requires_eval: params.requiresEval ?? true,
        status: "candidate",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Log event
    await supabase.from("event_log").insert({
      aggregate_type: "self_modification_proposal",
      aggregate_id: data.id,
      event_type: "self_mod.created",
      actor_type: "system",
      payload_json: {
        target_component: params.targetComponent,
        proposed_version: params.proposedVersion,
        safety_flags: params.safetyFlags,
      },
    });

    console.log("[GodelMode] Proposal created:", data.id);
    return data;
  }

  /**
   * Mark proposal as evaluated (after Evaluation Rail passes).
   * Links the evaluation_run_id for traceability.
   */
  static async markEvaluated(proposalId: string, evaluationRunId: string, passed: boolean) {
    const newStatus = passed ? "evaluated" : "rejected";
    const { error } = await supabase
      .from("self_modification_proposals")
      .update({
        status: newStatus,
        evaluation_run_id: evaluationRunId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("status", "candidate");

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "self_modification_proposal",
      aggregate_id: proposalId,
      event_type: passed ? "self_mod.evaluation_passed" : "self_mod.evaluation_failed",
      actor_type: "system",
      payload_json: { evaluation_run_id: evaluationRunId },
    });

    console.log(`[GodelMode] Proposal ${proposalId} ${newStatus}`);
  }

  /**
   * Founder approves or rejects a proposal.
   */
  static async resolveApproval(proposalId: string, approvalId: string, approved: boolean) {
    const newStatus = approved ? "approved" : "rejected";
    const { error } = await supabase
      .from("self_modification_proposals")
      .update({
        status: newStatus,
        approval_id: approvalId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("status", "evaluated");

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "self_modification_proposal",
      aggregate_id: proposalId,
      event_type: approved ? "self_mod.approved" : "self_mod.rejected",
      actor_type: "founder",
      payload_json: { approval_id: approvalId },
    });

    console.log(`[GodelMode] Proposal ${proposalId} ${newStatus} by founder`);
  }

  /**
   * Promote an approved proposal. Stores previous version for rollback.
   */
  static async promote(proposalId: string, previousSnapshot: Record<string, unknown>) {
    const { error } = await supabase
      .from("self_modification_proposals")
      .update({
        status: "promoted",
        promoted_at: new Date().toISOString(),
        previous_version_snapshot: previousSnapshot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("status", "approved");

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "self_modification_proposal",
      aggregate_id: proposalId,
      event_type: "self_mod.promoted",
      actor_type: "system",
      payload_json: { has_rollback_snapshot: true },
    });

    console.log(`[GodelMode] Proposal ${proposalId} PROMOTED to production`);
  }

  /**
   * Rollback a promoted proposal to previous version.
   */
  static async rollback(proposalId: string) {
    const { error } = await supabase
      .from("self_modification_proposals")
      .update({
        rolled_back_at: new Date().toISOString(),
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("status", "promoted");

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "self_modification_proposal",
      aggregate_id: proposalId,
      event_type: "self_mod.rolled_back",
      actor_type: "founder",
      payload_json: {},
    });

    console.log(`[GodelMode] Proposal ${proposalId} ROLLED BACK`);
  }

  /**
   * List proposals with optional status filter.
   */
  static async list(statusFilter?: string) {
    let query = supabase
      .from("self_modification_proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
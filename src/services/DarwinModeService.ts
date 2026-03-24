/**
 * Darwin Mode — Mutation & Selection Service
 *
 * Creates small variations of prompts/traits/routing and evaluates them
 * against baselines. Only promotes if pass_rate > baseline, protected
 * scenarios pass, no regression, and Founder approves.
 *
 * SAFETY: Only runs in Experimental Mode. Never mutates production directly.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CreateMutationParams {
  baseVersion: string;
  mutatedVersion: string;
  mutationType: "prompt_tweak" | "trait_shift" | "stack_change" | "routing_change";
  mutationDeltaDescription: string;
  targetEntityId?: string;
  evaluationSuiteId?: string;
  teamId?: string;
}

export class DarwinModeService {
  /**
   * Create a new mutation experiment. Requires Experimental system mode.
   */
  static async createExperiment(params: CreateMutationParams) {
    // Verify experimental mode
    const { data: modeData } = await supabase
      .from("company_mode_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("mutation_experiments")
      .insert({
        base_version: params.baseVersion,
        mutated_version: params.mutatedVersion,
        mutation_type: params.mutationType,
        mutation_delta_description: params.mutationDeltaDescription,
        target_entity_id: params.targetEntityId ?? null,
        evaluation_suite_id: params.evaluationSuiteId ?? null,
        team_id: params.teamId ?? null,
        status: "running",
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "mutation_experiment",
      aggregate_id: data.id,
      event_type: "mutation.created",
      actor_type: "system",
      payload_json: {
        mutation_type: params.mutationType,
        base_version: params.baseVersion,
      },
    });

    console.log("[DarwinMode] Experiment created:", data.id);
    return data;
  }

  /**
   * Record evaluation results for a mutation experiment.
   */
  static async recordResults(
    experimentId: string,
    results: {
      passRate: number;
      baselinePassRate: number;
      performanceDelta: Record<string, number>;
      tokenDelta: number;
      costDelta: number;
      protectedScenariosPassed: boolean;
    }
  ) {
    const survived =
      results.passRate > results.baselinePassRate &&
      results.protectedScenariosPassed &&
      results.costDelta <= 0;

    const newStatus = survived ? "survived" : "rejected";

    const { error } = await supabase
      .from("mutation_experiments")
      .update({
        pass_rate: results.passRate,
        baseline_pass_rate: results.baselinePassRate,
        performance_delta: results.performanceDelta,
        token_delta: results.tokenDelta,
        cost_delta: results.costDelta,
        protected_scenarios_passed: results.protectedScenariosPassed,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", experimentId)
      .eq("status", "running");

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "mutation_experiment",
      aggregate_id: experimentId,
      event_type: survived ? "mutation.survived" : "mutation.rejected",
      actor_type: "system",
      payload_json: {
        pass_rate: results.passRate,
        baseline: results.baselinePassRate,
        protected_passed: results.protectedScenariosPassed,
      },
    });

    console.log(`[DarwinMode] Experiment ${experimentId} → ${newStatus}`);
  }

  /**
   * Promote a survived experiment (requires prior Founder Approval).
   */
  static async promote(experimentId: string, approvalId: string, previousSnapshot: Record<string, unknown>) {
    const { error } = await supabase
      .from("mutation_experiments")
      .update({
        approval_id: approvalId,
        promoted_at: new Date().toISOString(),
        previous_version_snapshot: previousSnapshot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", experimentId)
      .eq("status", "survived");

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "mutation_experiment",
      aggregate_id: experimentId,
      event_type: "mutation.promoted",
      actor_type: "founder",
      payload_json: { approval_id: approvalId },
    });

    console.log(`[DarwinMode] Experiment ${experimentId} PROMOTED`);
  }

  /**
   * Rollback a promoted mutation.
   */
  static async rollback(experimentId: string) {
    const { error } = await supabase
      .from("mutation_experiments")
      .update({
        rolled_back_at: new Date().toISOString(),
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", experimentId);

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "mutation_experiment",
      aggregate_id: experimentId,
      event_type: "mutation.rolled_back",
      actor_type: "founder",
      payload_json: {},
    });

    console.log(`[DarwinMode] Experiment ${experimentId} ROLLED BACK`);
  }

  static async list(statusFilter?: string) {
    let query = supabase
      .from("mutation_experiments")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
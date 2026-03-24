/**
 * Cybernetic Feedback Loop — Self-Correction Service
 *
 * Monitors system health metrics (rework rate, escalation frequency,
 * CI failures, eval failures, deploy rollbacks, token inefficiency).
 * When anomalies are detected, generates CorrectionProposals — never
 * enforces changes automatically.
 *
 * SAFETY: No automatic enforcement. All corrections are proposals only.
 */

import { supabase } from "@/integrations/supabase/client";

export interface AnomalyDetection {
  triggerType: string;
  metricValue: number;
  threshold: number;
  targetComponent: "prompt" | "rubric" | "guard" | "contract" | "retrieval_rule" | "trait" | "stack" | "routing";
  targetEntityId?: string;
  suggestionSummary: string;
  suggestedAction: string;
  severity: "info" | "warning" | "critical";
  teamId?: string;
}

export class CyberneticLoopService {
  /**
   * Generate a correction proposal from anomaly detection.
   */
  static async createCorrectionProposal(anomaly: AnomalyDetection) {
    const { data, error } = await supabase
      .from("correction_proposals")
      .insert({
        trigger_type: anomaly.triggerType,
        trigger_metric_value: anomaly.metricValue,
        trigger_threshold: anomaly.threshold,
        target_component: anomaly.targetComponent,
        target_entity_id: anomaly.targetEntityId ?? null,
        suggestion_summary: anomaly.suggestionSummary,
        suggested_action: anomaly.suggestedAction,
        severity: anomaly.severity,
        team_id: anomaly.teamId ?? null,
        status: "proposed",
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "correction_proposal",
      aggregate_id: data.id,
      event_type: "correction.proposed",
      actor_type: "system",
      payload_json: {
        trigger_type: anomaly.triggerType,
        metric_value: anomaly.metricValue,
        severity: anomaly.severity,
      },
    });

    console.log("[CyberneticLoop] Correction proposed:", data.id, anomaly.triggerType);
    return data;
  }

  /**
   * Run anomaly detection scan across system metrics.
   */
  static async scanForAnomalies(): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    // Check rework rate (runs with run_number > 2)
    const { data: highRetryRuns } = await supabase
      .from("runs")
      .select("task_id, run_number")
      .gte("run_number", 3);

    if (highRetryRuns && highRetryRuns.length > 5) {
      anomalies.push({
        triggerType: "high_rework_rate",
        metricValue: highRetryRuns.length,
        threshold: 5,
        targetComponent: "prompt",
        suggestionSummary: `${highRetryRuns.length} tasks required 3+ execution attempts, indicating prompt or skill inefficiency.`,
        suggestedAction: "Review and refine prompts for roles with highest retry rates.",
        severity: "warning",
      });
    }

    // Check escalation frequency
    const { data: escalations } = await supabase
      .from("tasks")
      .select("id")
      .eq("state", "escalated");

    if (escalations && escalations.length > 3) {
      anomalies.push({
        triggerType: "high_escalation_frequency",
        metricValue: escalations.length,
        threshold: 3,
        targetComponent: "contract",
        suggestionSummary: `${escalations.length} tasks escalated, suggesting contract boundaries may be too restrictive.`,
        suggestedAction: "Review role contracts and widen permitted actions for impacted roles.",
        severity: "warning",
      });
    }

    // Check failed runs
    const { data: failedRuns } = await supabase
      .from("runs")
      .select("id")
      .eq("state", "failed");

    if (failedRuns && failedRuns.length > 10) {
      anomalies.push({
        triggerType: "high_failure_rate",
        metricValue: failedRuns.length,
        threshold: 10,
        targetComponent: "prompt",
        suggestionSummary: `${failedRuns.length} failed runs detected. Possible systemic prompt or model issue.`,
        suggestedAction: "Trigger Gödel Mode analysis on failing role prompts.",
        severity: "critical",
      });
    }

    // Check deploy rollbacks
    const { data: rollbacks } = await supabase
      .from("deployments")
      .select("id")
      .not("rollback_of_deployment_id", "is", null);

    if (rollbacks && rollbacks.length > 2) {
      anomalies.push({
        triggerType: "deploy_rollback_frequency",
        metricValue: rollbacks.length,
        threshold: 2,
        targetComponent: "guard",
        suggestionSummary: `${rollbacks.length} deployment rollbacks. Quality gates may be insufficient.`,
        suggestedAction: "Tighten CI guard rules and add pre-deploy evaluation scenarios.",
        severity: "critical",
      });
    }

    return anomalies;
  }

  /**
   * Resolve a correction proposal.
   */
  static async resolve(proposalId: string, action: "applied" | "dismissed") {
    const { error } = await supabase
      .from("correction_proposals")
      .update({
        status: action,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", proposalId);

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "correction_proposal",
      aggregate_id: proposalId,
      event_type: `correction.${action}`,
      actor_type: "founder",
      payload_json: {},
    });

    console.log(`[CyberneticLoop] Correction ${proposalId} ${action}`);
  }

  static async listProposals(statusFilter?: "proposed" | "acknowledged" | "applied" | "dismissed") {
    let query = supabase
      .from("correction_proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter) query = query.eq("status", statusFilter as any);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
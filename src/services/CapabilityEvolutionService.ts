/**
 * Capability Evolution Service
 *
 * Tracks team-level performance trends, stability scores, risk drift.
 * High-performing stable capabilities can be cloned as templates.
 *
 * SAFETY: Cloning creates a new capability from template — never modifies
 * existing capabilities automatically.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CapabilityMetrics {
  teamId: string;
  teamName: string;
  avgEvalPassRate: number;
  avgSuccessRate: number;
  stabilityScore: number;
  riskDrift: number;
  totalRuns: number;
  failedRuns: number;
}

export class CapabilityEvolutionService {
  /**
   * Calculate performance metrics for a capability (team).
   */
  static async calculateMetrics(teamId: string): Promise<CapabilityMetrics> {
    const { data: team } = await supabase
      .from("teams")
      .select("id, name")
      .eq("id", teamId)
      .single();

    const { data: employees } = await supabase
      .from("ai_employees")
      .select("success_rate, bug_rate, escalation_rate, reputation_score")
      .eq("team_id", teamId)
      .not("status", "eq", "terminated");

    const emps = employees ?? [];
    const avgSuccess = emps.length > 0
      ? emps.reduce((s, e) => s + (e.success_rate ?? 0), 0) / emps.length
      : 0;
    const avgBugRate = emps.length > 0
      ? emps.reduce((s, e) => s + (e.bug_rate ?? 0), 0) / emps.length
      : 0;
    const avgEscalation = emps.length > 0
      ? emps.reduce((s, e) => s + (e.escalation_rate ?? 0), 0) / emps.length
      : 0;

    const stabilityScore = Math.max(0, Math.min(100,
      avgSuccess * 100 - avgBugRate * 50 - avgEscalation * 30
    ));

    const riskDrift = avgBugRate * 40 + avgEscalation * 60;

    return {
      teamId,
      teamName: team?.name ?? "Unknown",
      avgEvalPassRate: avgSuccess * 100,
      avgSuccessRate: avgSuccess * 100,
      stabilityScore,
      riskDrift,
      totalRuns: emps.length,
      failedRuns: 0,
    };
  }

  /**
   * Create a capability template from a high-performing team.
   */
  static async createTemplate(teamId: string) {
    const metrics = await this.calculateMetrics(teamId);

    if (metrics.stabilityScore < 60) {
      throw new Error(`Stability score ${metrics.stabilityScore.toFixed(1)} is below minimum 60 for template creation.`);
    }

    const { data: roles } = await supabase
      .from("agent_roles")
      .select("code, name, skill_profile, allowed_actions, forbidden_actions")
      .eq("team_id", teamId);

    const { data: contracts } = await supabase
      .from("role_contracts")
      .select("role_code, allowed_paths, allowed_domains, required_artifacts, review_required");

    const { data, error } = await supabase
      .from("capability_templates")
      .insert({
        name: `${metrics.teamName} Template`,
        source_team_id: teamId,
        inherited_roles: roles ?? [],
        inherited_contracts: contracts ?? [],
        inherited_traits: {},
        performance_snapshot: {
          stability_score: metrics.stabilityScore,
          avg_success_rate: metrics.avgSuccessRate,
          risk_drift: metrics.riskDrift,
          snapshot_at: new Date().toISOString(),
        },
        stability_score: metrics.stabilityScore,
      })
      .select("id")
      .single();

    if (error) throw error;

    await supabase.from("event_log").insert({
      aggregate_type: "capability_template",
      aggregate_id: data.id,
      event_type: "capability_template.created",
      actor_type: "system",
      payload_json: { source_team_id: teamId, stability_score: metrics.stabilityScore },
    });

    console.log(`[CapabilityEvolution] Template created from ${metrics.teamName}:`, data.id);
    return data;
  }

  static async listTemplates() {
    const { data, error } = await supabase
      .from("capability_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}
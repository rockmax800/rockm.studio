// PART 3 — Model Competition Service
// Scores models per department using weighted formula.
// PART 4 — Generates proactive hiring suggestions when better models detected.
// PART 8 — Does NOT auto-fire, auto-switch, or auto-hire.

export interface RankedModel {
  model_market_id: string;
  provider: string;
  model_name: string;
  competition_score: number;
  avg_success_rate: number;
  avg_cost: number;
  avg_latency: number;
  reliability_score: number;
  avg_quality_score: number;
  sample_size: number;
}

export interface UpgradeSuggestion {
  current_model: string;
  current_provider: string;
  suggested_model: string;
  suggested_provider: string;
  current_score: number;
  suggested_score: number;
  delta_percent: number;
  team_id: string | null;
  team_name: string | null;
  reason: string;
}

interface MarketModel {
  id: string;
  provider: string;
  model_name: string;
  avg_latency_score: number;
  avg_quality_score: number;
  reliability_score: number;
  estimated_cost_per_1k_tokens: number;
}

interface Benchmark {
  model_market_id: string;
  team_id: string | null;
  avg_success_rate: number;
  avg_cost: number;
  avg_latency: number;
  bug_rate: number;
  sample_size: number;
}

interface EmployeeInfo {
  id: string;
  provider: string | null;
  model_name: string | null;
  team_id: string | null;
  success_rate: number;
  avg_cost: number;
  avg_latency: number;
  status: string;
}

/**
 * Compute competition score for a model using unified ScoringService.
 */
export { computeCompetitionScore } from "@/services/ScoringService";

/**
 * Rank all models for a given team (or globally if teamId is null).
 */
export function rankModels(
  marketModels: MarketModel[],
  benchmarks: Benchmark[],
  teamId: string | null
): RankedModel[] {
  const modelsById = Object.fromEntries(marketModels.map(m => [m.id, m]));

  const teamBenchmarks = benchmarks.filter(b =>
    teamId ? b.team_id === teamId : true
  );

  const scored: RankedModel[] = [];

  for (const b of teamBenchmarks) {
    const market = modelsById[b.model_market_id];
    if (!market) continue;

    const score = computeCompetitionScore(b, market);

    scored.push({
      model_market_id: b.model_market_id,
      provider: market.provider,
      model_name: market.model_name,
      competition_score: Math.round(score * 1000) / 1000,
      avg_success_rate: b.avg_success_rate,
      avg_cost: b.avg_cost,
      avg_latency: b.avg_latency,
      reliability_score: market.reliability_score,
      avg_quality_score: market.avg_quality_score,
      sample_size: b.sample_size,
    });
  }

  // Also include market models without benchmarks (use market metadata only)
  for (const m of marketModels) {
    if (scored.some(s => s.model_market_id === m.id)) continue;
    const score =
      0.5 * 0.4 + // assume 50% success rate
      (1 / (1 + m.estimated_cost_per_1k_tokens)) * 0.2 +
      m.avg_latency_score * 0.1 +
      m.reliability_score * 0.2 +
      m.avg_quality_score * 0.1;

    scored.push({
      model_market_id: m.id,
      provider: m.provider,
      model_name: m.model_name,
      competition_score: Math.round(score * 1000) / 1000,
      avg_success_rate: 0,
      avg_cost: m.estimated_cost_per_1k_tokens,
      avg_latency: 0,
      reliability_score: m.reliability_score,
      avg_quality_score: m.avg_quality_score,
      sample_size: 0,
    });
  }

  return scored.sort((a, b) => b.competition_score - a.competition_score);
}

/**
 * PART 4 — Generate upgrade suggestions when a market model outperforms current employees by >10%.
 */
export function generateUpgradeSuggestions(
  rankedModels: RankedModel[],
  employees: EmployeeInfo[],
  teams: Array<{ id: string; name: string }>
): UpgradeSuggestion[] {
  const suggestions: UpgradeSuggestion[] = [];
  const teamsById = Object.fromEntries(teams.map(t => [t.id, t]));

  // Group active employees by team
  const activeEmployees = employees.filter(e => e.status === "active");
  const teamIds = [...new Set(activeEmployees.map(e => e.team_id).filter(Boolean))] as string[];

  for (const teamId of teamIds) {
    const teamEmployees = activeEmployees.filter(e => e.team_id === teamId);
    if (teamEmployees.length === 0) continue;

    // Find best current employee in team
    const bestEmployee = teamEmployees.reduce((best, emp) => {
      const empScore = computeCompetitionScore(
        { avg_success_rate: emp.success_rate, avg_cost: emp.avg_cost, avg_latency: emp.avg_latency },
        { reliability_score: 0.5, avg_quality_score: 0.5 }
      );
      const bestScore = computeCompetitionScore(
        { avg_success_rate: best.success_rate, avg_cost: best.avg_cost, avg_latency: best.avg_latency },
        { reliability_score: 0.5, avg_quality_score: 0.5 }
      );
      return empScore > bestScore ? emp : best;
    });

    const currentScore = computeCompetitionScore(
      { avg_success_rate: bestEmployee.success_rate, avg_cost: bestEmployee.avg_cost, avg_latency: bestEmployee.avg_latency },
      { reliability_score: 0.5, avg_quality_score: 0.5 }
    );

    // Check if any market model outperforms by >10%
    const topModel = rankedModels[0];
    if (topModel && topModel.model_name !== bestEmployee.model_name) {
      const delta = ((topModel.competition_score - currentScore) / (currentScore || 0.001)) * 100;
      if (delta > 10) {
        suggestions.push({
          current_model: bestEmployee.model_name ?? "unknown",
          current_provider: bestEmployee.provider ?? "unknown",
          suggested_model: topModel.model_name,
          suggested_provider: topModel.provider,
          current_score: Math.round(currentScore * 1000) / 1000,
          suggested_score: topModel.competition_score,
          delta_percent: Math.round(delta * 10) / 10,
          team_id: teamId,
          team_name: teamsById[teamId]?.name ?? "Unknown",
          reason: `${topModel.model_name} (${topModel.provider}) scores ${topModel.competition_score.toFixed(3)} vs current best ${currentScore.toFixed(3)} — ${Math.round(delta)}% improvement potential`,
        });
      }
    }
  }

  return suggestions;
}

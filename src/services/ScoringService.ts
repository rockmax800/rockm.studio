// PART 5 — Unified Scoring Service
// Single scoring formula used across all modules.

export interface ScoringInput {
  success_rate: number;   // 0–1
  avg_cost: number;       // USD
  avg_latency: number;    // ms
  bug_rate: number;       // 0–1
  escalation_rate: number; // 0–1
}

/**
 * computePerformanceScore — Unified scoring function.
 * Returns 0–1 score. Higher is better.
 *
 * Weights:
 *   success_rate: 40%
 *   cost efficiency: 15% (inverse — lower cost = higher score)
 *   latency efficiency: 10% (inverse — lower latency = higher score)
 *   bug penalty: 20% (inverse — lower bugs = higher score)
 *   escalation penalty: 15% (inverse — lower escalation = higher score)
 */
export function computePerformanceScore(input: ScoringInput): number {
  const {
    success_rate,
    avg_cost,
    avg_latency,
    bug_rate,
    escalation_rate,
  } = input;

  const costEfficiency = 1 / (1 + avg_cost);
  const latencyEfficiency = 1 / (1 + avg_latency / 1000); // normalize ms to seconds

  const score =
    success_rate * 0.40 +
    costEfficiency * 0.15 +
    latencyEfficiency * 0.10 +
    (1 - bug_rate) * 0.20 +
    (1 - escalation_rate) * 0.15;

  return Math.max(0, Math.min(1, score));
}

/**
 * computeCompetitionScore — For model market ranking.
 * Uses same core formula but weights differently for comparison.
 */
export function computeCompetitionScore(input: {
  avg_success_rate: number;
  avg_cost: number;
  avg_latency: number;
  reliability_score: number;
  avg_quality_score: number;
}): number {
  const costEfficiency = 1 / (1 + input.avg_cost);
  const latencyEfficiency = 1 / (1 + input.avg_latency / 1000);

  return (
    input.avg_success_rate * 0.35 +
    costEfficiency * 0.15 +
    latencyEfficiency * 0.10 +
    input.reliability_score * 0.20 +
    input.avg_quality_score * 0.20
  );
}

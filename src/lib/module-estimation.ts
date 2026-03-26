// Module-Aware Estimation Engine — Intent Plane planning artifact
// Generates per-module token, cost, and timeline estimates using
// SystemModule metadata (complexity, risk) instead of flat name matching.
// Does NOT create Delivery Plane state.

import type { SystemModule, ComplexityEstimate, RiskLevel } from "@/types/front-office-planning";

export interface ModuleEstimateRow {
  name: string;
  tokens: number;
  cost: number;
  days: number;
  complexity: ComplexityEstimate;
  riskLevel: RiskLevel;
  featureCount: number;
}

export interface EstimateSummary {
  rows: ModuleEstimateRow[];
  totalTokens: number;
  totalCost: number;
  totalDays: number;
  moduleCount: number;
}

// ── Token multipliers by complexity band ──

const COMPLEXITY_TOKEN_BASE: Record<ComplexityEstimate, number> = {
  trivial: 8_000,
  small: 20_000,
  medium: 40_000,
  large: 70_000,
  xlarge: 110_000,
};

const COMPLEXITY_COST_BASE: Record<ComplexityEstimate, number> = {
  trivial: 2,
  small: 5,
  medium: 10,
  large: 20,
  xlarge: 35,
};

const COMPLEXITY_DAYS_BASE: Record<ComplexityEstimate, number> = {
  trivial: 0.5,
  small: 1,
  medium: 2,
  large: 4,
  xlarge: 7,
};

const RISK_MULTIPLIER: Record<RiskLevel, number> = {
  low: 1.0,
  medium: 1.15,
  high: 1.35,
  critical: 1.6,
};

/**
 * Estimate a single module from its SystemModule metadata.
 * Uses complexity band + risk multiplier + feature count scaling.
 */
export function estimateModule(mod: SystemModule): ModuleEstimateRow {
  const featureCount = Math.max(mod.coreFeatures.length, 1);
  const featureScale = 1 + (featureCount - 1) * 0.2; // each extra feature adds 20%
  const risk = RISK_MULTIPLIER[mod.riskLevel];

  const tokens = Math.round(COMPLEXITY_TOKEN_BASE[mod.complexityEstimate] * featureScale * risk);
  const cost = Math.round(COMPLEXITY_COST_BASE[mod.complexityEstimate] * featureScale * risk * 100) / 100;
  const days = Math.round(COMPLEXITY_DAYS_BASE[mod.complexityEstimate] * featureScale * risk * 10) / 10;

  return {
    name: mod.name,
    tokens,
    cost,
    complexity: mod.complexityEstimate,
    riskLevel: mod.riskLevel,
    featureCount,
    days,
  };
}

/**
 * Estimate all modules and produce an aggregate summary.
 * Timeline uses critical-path heuristic: longest single module + 30% of the rest.
 */
export function estimateModules(modules: SystemModule[]): EstimateSummary {
  if (modules.length === 0) {
    return { rows: [], totalTokens: 0, totalCost: 0, totalDays: 0, moduleCount: 0 };
  }

  const rows = modules.map(estimateModule);
  const totalTokens = rows.reduce((s, r) => s + r.tokens, 0);
  const totalCost = Math.round(rows.reduce((s, r) => s + r.cost, 0) * 100) / 100;

  // Critical-path heuristic: max module + 30% of remaining modules' days
  const sortedDays = rows.map((r) => r.days).sort((a, b) => b - a);
  const longestModule = sortedDays[0] ?? 0;
  const remainingDays = sortedDays.slice(1).reduce((s, d) => s + d, 0);
  const totalDays = Math.round((longestModule + remainingDays * 0.3) * 10) / 10;

  return { rows, totalTokens, totalCost, totalDays, moduleCount: modules.length };
}

/**
 * Fallback: estimate from plain module name strings (legacy path).
 * Creates synthetic SystemModule shells for compatibility.
 */
export function estimateFromNames(names: string[]): EstimateSummary {
  const KNOWN_COMPLEX = new Set([
    "Payments", "Real-time Chat", "Search Engine", "Analytics",
    "Authentication", "File Management", "Notifications",
  ]);

  const syntheticModules: SystemModule[] = names.map((name) => ({
    name,
    purpose: name,
    coreFeatures: [name],
    dependencies: [],
    riskLevel: KNOWN_COMPLEX.has(name) ? "medium" as const : "low" as const,
    complexityEstimate: KNOWN_COMPLEX.has(name) ? "large" as const : "medium" as const,
    mvpOptional: false,
  }));

  return estimateModules(syntheticModules);
}

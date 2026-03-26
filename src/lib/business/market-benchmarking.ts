import type {
  RoleBenchmarkLine,
  MarketBenchmarkInputs,
  MarketBenchmarkResult,
  SalaryBenchmark,
  VelocityProfile,
  RoleCode,
  CountryCode,
} from "@/types/market-benchmark";
import {
  DEFAULT_SALARY_BENCHMARKS,
  DEFAULT_VELOCITY_PROFILES,
  DEFAULT_OVERHEAD_MULTIPLIERS,
  DEFAULT_ASSUMPTIONS_VERSION,
  ROLE_LABELS,
} from "@/config/market-benchmark-defaults";

// ── Suggest role mix from a blueprint-like scope description ──

export interface BlueprintRoleSuggestion {
  roleCode: RoleCode;
  roleLabel: string;
  suggestedAllocationPct: number;
  suggestedEffortMonths: number;
  rationale: string;
}

export interface BriefSignals {
  scopeKeywords?: string[];
  complexity?: "low" | "medium" | "high" | "critical";
  projectType?: string;
  hasFrontend?: boolean;
  hasBackend?: boolean;
  hasDesignSystem?: boolean;
  moduleCount?: number;
}

const EFFORT_BY_COMPLEXITY: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 4,
  critical: 6,
};

/**
 * Deterministic heuristic: infers a probable human team composition from brief signals.
 * Returns a founder-editable suggestion list. Every allocation bump has an explicit rationale.
 */
export function suggestRoleMixFromBlueprint(
  signals: BriefSignals = {}
): BlueprintRoleSuggestion[] {
  const kw = new Set((signals.scopeKeywords ?? []).map((k) => k.toLowerCase()));
  const cx = signals.complexity ?? "medium";
  const baseEffort = EFFORT_BY_COMPLEXITY[cx] ?? 2;
  const hasFE = signals.hasFrontend ?? kw.has("frontend") || kw.has("ui") || kw.has("design-system");
  const hasBE = signals.hasBackend ?? kw.has("api") || kw.has("backend") || kw.has("database");
  const hasDS = signals.hasDesignSystem ?? kw.has("design-system");
  const mods = signals.moduleCount ?? 0;

  return DEFAULT_VELOCITY_PROFILES.map((vp) => {
    let alloc = vp.defaultAllocationPct;
    let effortMul = 1.0;
    const reasons: string[] = [`Base allocation ${(vp.defaultAllocationPct * 100).toFixed(0)}%`];

    // Product strategist scales with complexity
    if (vp.roleCode === "product_strategist" && (cx === "high" || cx === "critical")) {
      alloc = Math.min(alloc + 0.05, 0.30);
      reasons.push(`+5% — ${cx} complexity needs more strategy`);
    }

    // Solution architect scales with module count
    if (vp.roleCode === "solution_architect") {
      if (mods > 4) {
        alloc = Math.min(alloc + 0.10, 0.30);
        reasons.push(`+10% — ${mods} modules require significant architecture work`);
      } else if (cx === "high" || cx === "critical") {
        alloc = Math.min(alloc + 0.05, 0.25);
        reasons.push(`+5% — ${cx} complexity needs deeper architecture`);
      }
    }

    // Frontend builder
    if (vp.roleCode === "frontend_builder") {
      if (hasFE) {
        alloc = Math.min(alloc + 0.10, 0.45);
        reasons.push("+10% — frontend/UI work detected in brief");
      }
      if (hasDS) {
        alloc = Math.min(alloc + 0.05, 0.50);
        reasons.push("+5% — design system requirement");
      }
    }

    // Backend implementer
    if (vp.roleCode === "backend_implementer") {
      if (hasBE) {
        alloc = Math.min(alloc + 0.10, 0.45);
        reasons.push("+10% — backend/API/database work detected");
      }
    }

    // QA agent
    if (vp.roleCode === "qa_agent") {
      if (kw.has("testing") || kw.has("qa")) {
        alloc = Math.min(alloc + 0.05, 0.25);
        reasons.push("+5% — explicit testing/QA requirement");
      }
      if (cx === "critical") {
        alloc = Math.min(alloc + 0.05, 0.25);
        effortMul = 1.2;
        reasons.push("+5% — critical complexity demands extended QA");
      }
    }

    // Reviewer
    if (vp.roleCode === "reviewer" && (cx === "high" || cx === "critical")) {
      alloc = Math.min(alloc + 0.05, 0.20);
      reasons.push(`+5% — ${cx} complexity needs heavier review`);
    }

    // Release coordinator
    if (vp.roleCode === "release_coordinator" && mods > 4) {
      alloc = Math.min(alloc + 0.03, 0.12);
      reasons.push("+3% — multi-module release coordination");
    }

    return {
      roleCode: vp.roleCode,
      roleLabel: ROLE_LABELS[vp.roleCode] ?? vp.roleCode,
      suggestedAllocationPct: Math.round(alloc * 100) / 100,
      suggestedEffortMonths: Math.round(baseEffort * effortMul * 10) / 10,
      rationale: reasons.join(". ") + ".",
    };
  });
}

// ── Build role benchmark lines ──

export function buildRoleBenchmarkLines(opts: {
  roleCodes: RoleCode[];
  countryCode: CountryCode;
  effortMonths: number;
  allocationOverrides?: Partial<Record<RoleCode, number>>;
  overheadOverride?: number;
  salaryBenchmarks?: SalaryBenchmark[];
  velocityProfiles?: VelocityProfile[];
}): RoleBenchmarkLine[] {
  const salaries = opts.salaryBenchmarks ?? DEFAULT_SALARY_BENCHMARKS;
  const velocities = opts.velocityProfiles ?? DEFAULT_VELOCITY_PROFILES;
  const overhead = opts.overheadOverride ?? DEFAULT_OVERHEAD_MULTIPLIERS[opts.countryCode] ?? 1.20;

  return opts.roleCodes.map((roleCode) => {
    const sal = salaries.find((s) => s.roleCode === roleCode && s.countryCode === opts.countryCode);
    const vel = velocities.find((v) => v.roleCode === roleCode);

    const monthlySalary = sal?.monthlySalaryUsd ?? 0;
    const velocityIndex = vel?.velocityIndex ?? 1.0;
    const allocationPct = opts.allocationOverrides?.[roleCode] ?? vel?.defaultAllocationPct ?? 0.10;

    const hec = monthlySalary * opts.effortMonths * allocationPct * overhead;

    return {
      roleCode,
      roleLabel: ROLE_LABELS[roleCode] ?? roleCode,
      countryCode: opts.countryCode,
      monthlySalaryUsd: monthlySalary,
      effortMonths: opts.effortMonths,
      allocationPct,
      overheadMultiplier: overhead,
      velocityIndex,
      humanEquivalentCostUsd: Math.round(hec * 100) / 100,
    };
  });
}

// ── Core calculation ──

export function calculateMarketBenchmark(inputs: MarketBenchmarkInputs): MarketBenchmarkResult {
  const hecUsd = inputs.roleLines.reduce((sum, l) => sum + l.humanEquivalentCostUsd, 0);
  const aicUsd = inputs.aiInternalCostUsd;
  const sopUsd = inputs.studioOfferPriceUsd;

  return {
    hecUsd: Math.round(hecUsd * 100) / 100,
    aicUsd,
    sopUsd,
    advantageRatio: aicUsd > 0 ? Math.round((hecUsd / aicUsd) * 100) / 100 : null,
    valueCapture: hecUsd > 0 ? Math.round((sopUsd / hecUsd) * 100) / 100 : null,
    grossAiMarginUsd: Math.round((sopUsd - aicUsd) * 100) / 100,
    aiEfficiencySpread: hecUsd > 0 ? Math.round(((hecUsd - aicUsd) / hecUsd) * 10000) / 10000 : null,
    breakEvenStudioPriceUsd: aicUsd > 0 ? aicUsd : null,
  };
}

// ── Validation ──

export interface BenchmarkValidationError {
  field: string;
  message: string;
}

export function validateBenchmarkInputs(inputs: MarketBenchmarkInputs): BenchmarkValidationError[] {
  const errors: BenchmarkValidationError[] = [];

  if (!inputs.assumptionsVersion) {
    errors.push({ field: "assumptionsVersion", message: "Assumptions version is required" });
  }
  if (inputs.roleLines.length === 0) {
    errors.push({ field: "roleLines", message: "At least one role line is required" });
  }
  if (inputs.aiInternalCostUsd < 0) {
    errors.push({ field: "aiInternalCostUsd", message: "AI internal cost cannot be negative" });
  }
  if (inputs.studioOfferPriceUsd < 0) {
    errors.push({ field: "studioOfferPriceUsd", message: "Studio offer price cannot be negative" });
  }
  if (inputs.studioOfferPriceUsd > 0 && inputs.studioOfferPriceUsd < inputs.aiInternalCostUsd) {
    errors.push({ field: "studioOfferPriceUsd", message: "Studio offer price is below AI internal cost — negative margin" });
  }

  for (const line of inputs.roleLines) {
    if (line.allocationPct < 0 || line.allocationPct > 1) {
      errors.push({ field: `roleLines.${line.roleCode}.allocationPct`, message: `Allocation for ${line.roleLabel} must be between 0 and 1` });
    }
    if (line.effortMonths <= 0) {
      errors.push({ field: `roleLines.${line.roleCode}.effortMonths`, message: `Effort months for ${line.roleLabel} must be positive` });
    }
    if (line.overheadMultiplier < 1) {
      errors.push({ field: `roleLines.${line.roleCode}.overheadMultiplier`, message: `Overhead multiplier for ${line.roleLabel} must be ≥ 1` });
    }
  }

  return errors;
}

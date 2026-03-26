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
}

/**
 * Returns a default role mix suggestion.
 * `scopeKeywords` is a simple heuristic input (e.g. ["frontend", "api", "design-system"]).
 * The founder is expected to review and override.
 */
export function suggestRoleMixFromBlueprint(
  scopeKeywords: string[] = []
): BlueprintRoleSuggestion[] {
  const kw = new Set(scopeKeywords.map((k) => k.toLowerCase()));

  return DEFAULT_VELOCITY_PROFILES.map((vp) => {
    let alloc = vp.defaultAllocationPct;

    // Simple heuristic bumps — founder overrides anyway
    if (vp.roleCode === "frontend_builder" && (kw.has("frontend") || kw.has("ui") || kw.has("design-system"))) {
      alloc = Math.min(alloc + 0.10, 0.50);
    }
    if (vp.roleCode === "backend_implementer" && (kw.has("api") || kw.has("backend") || kw.has("database"))) {
      alloc = Math.min(alloc + 0.10, 0.50);
    }
    if (vp.roleCode === "qa_agent" && (kw.has("testing") || kw.has("qa"))) {
      alloc = Math.min(alloc + 0.05, 0.25);
    }

    return {
      roleCode: vp.roleCode,
      roleLabel: ROLE_LABELS[vp.roleCode] ?? vp.roleCode,
      suggestedAllocationPct: alloc,
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

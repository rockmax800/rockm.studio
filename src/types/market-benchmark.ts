export type CountryCode = string;
export type RoleCode = string;

export interface SalaryBenchmark {
  roleCode: RoleCode;
  countryCode: CountryCode;
  monthlySalaryUsd: number;
  sourceLabel: string;
  sourceVersion: string;
}

export interface VelocityProfile {
  roleCode: RoleCode;
  profileName: string;
  velocityIndex: number;
  defaultAllocationPct: number;
  sourceVersion: string;
}

export interface RoleBenchmarkLine {
  roleCode: RoleCode;
  roleLabel: string;
  countryCode: CountryCode;
  monthlySalaryUsd: number;
  effortMonths: number;
  allocationPct: number;
  overheadMultiplier: number;
  velocityIndex: number;
  humanEquivalentCostUsd: number;
}

export interface MarketBenchmarkInputs {
  roleLines: RoleBenchmarkLine[];
  aiInternalCostUsd: number;
  studioOfferPriceUsd: number;
  assumptionsVersion: string;
}

export interface MarketBenchmarkResult {
  hecUsd: number;
  aicUsd: number;
  sopUsd: number;
  advantageRatio: number | null;
  valueCapture: number | null;
  grossAiMarginUsd: number;
  aiEfficiencySpread: number | null;
  breakEvenStudioPriceUsd: number | null;
}

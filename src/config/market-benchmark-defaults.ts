import type { SalaryBenchmark, VelocityProfile } from "@/types/market-benchmark";

const V = "defaults-2025-Q1";

export const ROLE_LABELS: Record<string, string> = {
  product_strategist: "Product Strategist",
  solution_architect: "Solution Architect",
  frontend_builder: "Frontend Builder",
  backend_implementer: "Backend Implementer",
  reviewer: "Reviewer",
  qa_agent: "QA Agent",
  release_coordinator: "Release Coordinator",
};

export const DEFAULT_SALARY_BENCHMARKS: SalaryBenchmark[] = [
  // US
  { roleCode: "product_strategist",  countryCode: "US", monthlySalaryUsd: 12500, sourceLabel: "Glassdoor avg", sourceVersion: V },
  { roleCode: "solution_architect",  countryCode: "US", monthlySalaryUsd: 14000, sourceLabel: "Glassdoor avg", sourceVersion: V },
  { roleCode: "frontend_builder",    countryCode: "US", monthlySalaryUsd: 10000, sourceLabel: "Glassdoor avg", sourceVersion: V },
  { roleCode: "backend_implementer", countryCode: "US", monthlySalaryUsd: 11000, sourceLabel: "Glassdoor avg", sourceVersion: V },
  { roleCode: "reviewer",            countryCode: "US", monthlySalaryUsd: 9500,  sourceLabel: "Glassdoor avg", sourceVersion: V },
  { roleCode: "qa_agent",            countryCode: "US", monthlySalaryUsd: 8500,  sourceLabel: "Glassdoor avg", sourceVersion: V },
  { roleCode: "release_coordinator", countryCode: "US", monthlySalaryUsd: 9000,  sourceLabel: "Glassdoor avg", sourceVersion: V },
  // PL
  { roleCode: "product_strategist",  countryCode: "PL", monthlySalaryUsd: 5500,  sourceLabel: "Levels.fyi avg", sourceVersion: V },
  { roleCode: "solution_architect",  countryCode: "PL", monthlySalaryUsd: 6500,  sourceLabel: "Levels.fyi avg", sourceVersion: V },
  { roleCode: "frontend_builder",    countryCode: "PL", monthlySalaryUsd: 4500,  sourceLabel: "Levels.fyi avg", sourceVersion: V },
  { roleCode: "backend_implementer", countryCode: "PL", monthlySalaryUsd: 5000,  sourceLabel: "Levels.fyi avg", sourceVersion: V },
  { roleCode: "reviewer",            countryCode: "PL", monthlySalaryUsd: 4200,  sourceLabel: "Levels.fyi avg", sourceVersion: V },
  { roleCode: "qa_agent",            countryCode: "PL", monthlySalaryUsd: 3800,  sourceLabel: "Levels.fyi avg", sourceVersion: V },
  { roleCode: "release_coordinator", countryCode: "PL", monthlySalaryUsd: 4000,  sourceLabel: "Levels.fyi avg", sourceVersion: V },
  // UA
  { roleCode: "product_strategist",  countryCode: "UA", monthlySalaryUsd: 3500,  sourceLabel: "DOU avg", sourceVersion: V },
  { roleCode: "solution_architect",  countryCode: "UA", monthlySalaryUsd: 4500,  sourceLabel: "DOU avg", sourceVersion: V },
  { roleCode: "frontend_builder",    countryCode: "UA", monthlySalaryUsd: 3000,  sourceLabel: "DOU avg", sourceVersion: V },
  { roleCode: "backend_implementer", countryCode: "UA", monthlySalaryUsd: 3200,  sourceLabel: "DOU avg", sourceVersion: V },
  { roleCode: "reviewer",            countryCode: "UA", monthlySalaryUsd: 2800,  sourceLabel: "DOU avg", sourceVersion: V },
  { roleCode: "qa_agent",            countryCode: "UA", monthlySalaryUsd: 2200,  sourceLabel: "DOU avg", sourceVersion: V },
  { roleCode: "release_coordinator", countryCode: "UA", monthlySalaryUsd: 2500,  sourceLabel: "DOU avg", sourceVersion: V },
  // IN
  { roleCode: "product_strategist",  countryCode: "IN", monthlySalaryUsd: 2800,  sourceLabel: "AmbitionBox avg", sourceVersion: V },
  { roleCode: "solution_architect",  countryCode: "IN", monthlySalaryUsd: 3500,  sourceLabel: "AmbitionBox avg", sourceVersion: V },
  { roleCode: "frontend_builder",    countryCode: "IN", monthlySalaryUsd: 2200,  sourceLabel: "AmbitionBox avg", sourceVersion: V },
  { roleCode: "backend_implementer", countryCode: "IN", monthlySalaryUsd: 2500,  sourceLabel: "AmbitionBox avg", sourceVersion: V },
  { roleCode: "reviewer",            countryCode: "IN", monthlySalaryUsd: 2000,  sourceLabel: "AmbitionBox avg", sourceVersion: V },
  { roleCode: "qa_agent",            countryCode: "IN", monthlySalaryUsd: 1600,  sourceLabel: "AmbitionBox avg", sourceVersion: V },
  { roleCode: "release_coordinator", countryCode: "IN", monthlySalaryUsd: 1800,  sourceLabel: "AmbitionBox avg", sourceVersion: V },
];

export const DEFAULT_VELOCITY_PROFILES: VelocityProfile[] = [
  { roleCode: "product_strategist",  profileName: "default", velocityIndex: 1.0, defaultAllocationPct: 0.15, sourceVersion: V },
  { roleCode: "solution_architect",  profileName: "default", velocityIndex: 1.0, defaultAllocationPct: 0.15, sourceVersion: V },
  { roleCode: "frontend_builder",    profileName: "default", velocityIndex: 1.0, defaultAllocationPct: 0.25, sourceVersion: V },
  { roleCode: "backend_implementer", profileName: "default", velocityIndex: 1.0, defaultAllocationPct: 0.20, sourceVersion: V },
  { roleCode: "reviewer",            profileName: "default", velocityIndex: 1.0, defaultAllocationPct: 0.10, sourceVersion: V },
  { roleCode: "qa_agent",            profileName: "default", velocityIndex: 1.0, defaultAllocationPct: 0.10, sourceVersion: V },
  { roleCode: "release_coordinator", profileName: "default", velocityIndex: 1.0, defaultAllocationPct: 0.05, sourceVersion: V },
];

export const DEFAULT_OVERHEAD_MULTIPLIERS: Record<string, number> = {
  US: 1.35,
  PL: 1.25,
  UA: 1.15,
  IN: 1.18,
};

export const DEFAULT_ASSUMPTIONS_VERSION = V;

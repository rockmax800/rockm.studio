// HR Configuration Engine — Employee Operational Traits Schema
// All traits affect delivery behavior. No fictional backstories.
// No psychological stereotypes. No nationality traits. Operational only.

export const ROLE_OPTIONS = [
  { code: "product_strategist", label: "Product Strategist" },
  { code: "solution_architect", label: "Solution Architect" },
  { code: "backend_architect", label: "Backend Architect" },
  { code: "backend_implementer", label: "Backend Implementer" },
  { code: "frontend_builder", label: "Frontend Builder" },
  { code: "reviewer", label: "Reviewer" },
  { code: "qa_agent", label: "QA Agent" },
  { code: "release_coordinator", label: "Release Coordinator" },
] as const;

export const STACK_OPTIONS = [
  "React", "TypeScript", "Node.js", "Supabase", "PostgreSQL",
  "Python", "Go", "Rust", "Swift", "Kotlin", "Flutter",
  "Docker", "AWS", "GCP", "Tailwind CSS",
];

export const FOCUS_OPTIONS = [
  "Web Application", "Mobile App", "SaaS Platform",
  "API / Backend", "Bot / Automation", "Data Pipeline",
];

export const SENIORITY_OPTIONS = ["Junior", "Middle", "Senior", "Lead"] as const;
export type Seniority = typeof SENIORITY_OPTIONS[number];

export const RISK_TOLERANCE_OPTIONS = ["low", "medium", "high"] as const;
export type RiskTolerance = typeof RISK_TOLERANCE_OPTIONS[number];

export const BIAS_LEVEL_OPTIONS = ["low", "balanced", "high"] as const;
export type BiasLevel = typeof BIAS_LEVEL_OPTIONS[number];

// ── Employee Configuration (full operational profile) ──
export interface EmployeeConfig {
  // Identity
  name: string;
  roleCode: string;
  seniority: Seniority;

  // Stack
  primaryStack: string[];
  secondaryStack: string[];

  // Operational traits
  riskTolerance: RiskTolerance;
  strictness: number;              // 1–5 — review depth
  refactorBias: BiasLevel;         // how aggressively to refactor
  escalationThreshold: RiskTolerance; // when to escalate
  speedVsQuality: number;          // 0–100 (0=speed, 100=quality)
  tokenEfficiency: number;         // 0–100 (0=verbose, 100=minimal)
  testCoverageBias: BiasLevel;
  documentationBias: BiasLevel;

  // Permissions
  mayDeploy: boolean;
}

// ── Default config by role (operational only) ──
export function getDefaultConfig(roleCode: string): Partial<EmployeeConfig> {
  const defaults: Record<string, Partial<EmployeeConfig>> = {
    product_strategist:  { strictness: 2, refactorBias: "low", escalationThreshold: "low", speedVsQuality: 45, tokenEfficiency: 50, testCoverageBias: "low", documentationBias: "high", riskTolerance: "medium" },
    solution_architect:  { strictness: 4, refactorBias: "high", escalationThreshold: "medium", speedVsQuality: 75, tokenEfficiency: 65, testCoverageBias: "balanced", documentationBias: "high", riskTolerance: "low" },
    backend_architect:   { strictness: 4, refactorBias: "balanced", escalationThreshold: "medium", speedVsQuality: 80, tokenEfficiency: 70, testCoverageBias: "high", documentationBias: "high", riskTolerance: "low" },
    backend_implementer: { strictness: 3, refactorBias: "balanced", escalationThreshold: "medium", speedVsQuality: 50, tokenEfficiency: 55, testCoverageBias: "balanced", documentationBias: "balanced", riskTolerance: "medium" },
    frontend_builder:    { strictness: 3, refactorBias: "balanced", escalationThreshold: "medium", speedVsQuality: 45, tokenEfficiency: 50, testCoverageBias: "balanced", documentationBias: "low", riskTolerance: "medium" },
    reviewer:            { strictness: 5, refactorBias: "high", escalationThreshold: "low", speedVsQuality: 90, tokenEfficiency: 70, testCoverageBias: "high", documentationBias: "high", riskTolerance: "low" },
    qa_agent:            { strictness: 5, refactorBias: "balanced", escalationThreshold: "low", speedVsQuality: 85, tokenEfficiency: 60, testCoverageBias: "high", documentationBias: "balanced", riskTolerance: "low" },
    release_coordinator: { strictness: 3, refactorBias: "low", escalationThreshold: "medium", speedVsQuality: 55, tokenEfficiency: 60, testCoverageBias: "balanced", documentationBias: "balanced", riskTolerance: "medium" },
  };
  return defaults[roleCode] ?? {
    strictness: 3, refactorBias: "balanced" as BiasLevel, escalationThreshold: "medium" as RiskTolerance,
    speedVsQuality: 50, tokenEfficiency: 50, testCoverageBias: "balanced" as BiasLevel,
    documentationBias: "balanced" as BiasLevel, riskTolerance: "medium" as RiskTolerance,
  };
}

// ── HR Proposal ──
export interface HRProposal {
  id: string;
  capabilityId: string;
  capabilityName: string;
  suggestedRole: string;
  suggestedSeniority: Seniority;
  primaryStack: string[];
  secondaryStack: string[];
  traits: {
    riskTolerance: RiskTolerance;
    strictness: number;
    refactorBias: BiasLevel;
    escalationThreshold: RiskTolerance;
    speedVsQuality: number;
    tokenEfficiency: number;
    testCoverageBias: BiasLevel;
    documentationBias: BiasLevel;
  };
  rationale: string;
  teamBalanceImpact: string;
  expectedImprovement: string;
  riskFlag?: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

// ── Team Balance Validation ──
export interface TeamBalanceWarning {
  type: "error" | "warning";
  message: string;
}

export function validateTeamBalance(members: { roleCode: string; seniority: string; speedVsQuality?: number; riskTolerance?: string }[]): TeamBalanceWarning[] {
  const warnings: TeamBalanceWarning[] = [];
  if (members.length === 0) return warnings;

  const roleCounts: Record<string, number> = {};
  const seniorityCounts: Record<string, number> = {};
  let highRiskCount = 0;
  let speedBiasedCount = 0;

  for (const m of members) {
    roleCounts[m.roleCode] = (roleCounts[m.roleCode] ?? 0) + 1;
    seniorityCounts[m.seniority] = (seniorityCounts[m.seniority] ?? 0) + 1;
    if (m.riskTolerance === "high") highRiskCount++;
    if ((m.speedVsQuality ?? 50) < 35) speedBiasedCount++;
  }

  if (!roleCounts["reviewer"]) {
    warnings.push({ type: "error", message: "Team must include at least one Reviewer" });
  }
  if (!roleCounts["qa_agent"]) {
    warnings.push({ type: "error", message: "Team must include at least one QA Agent" });
  }
  if (!seniorityCounts["Senior"] && !seniorityCounts["Lead"]) {
    warnings.push({ type: "error", message: "Team must include at least one Senior or Lead" });
  }
  if ((seniorityCounts["Lead"] ?? 0) > 2) {
    warnings.push({ type: "warning", message: `${seniorityCounts["Lead"]} Leads — consider balancing seniority` });
  }
  if (highRiskCount / members.length > 0.4) {
    warnings.push({ type: "warning", message: `${Math.round(highRiskCount / members.length * 100)}% high risk tolerance — exceeds 40% limit` });
  }
  if (speedBiasedCount / members.length > 0.6) {
    warnings.push({ type: "warning", message: `${Math.round(speedBiasedCount / members.length * 100)}% speed-biased — exceeds 60% limit` });
  }

  return warnings;
}

// ── Generate HR Proposals ──
export function generateHRProposals(
  capabilityId: string,
  capabilityName: string,
  currentMembers: { roleCode: string; seniority: string; riskTolerance?: string; speedVsQuality?: number; successRate?: number; bugRate?: number }[],
  capStack: string[],
): HRProposal[] {
  const proposals: HRProposal[] = [];
  const roleCounts: Record<string, number> = {};
  const seniorityCounts: Record<string, number> = {};

  for (const m of currentMembers) {
    roleCounts[m.roleCode] = (roleCounts[m.roleCode] ?? 0) + 1;
    seniorityCounts[m.seniority] = (seniorityCounts[m.seniority] ?? 0) + 1;
  }

  const makeId = () => crypto.randomUUID();
  const compose = (after: { role: string; seniority: string }): string => {
    const updated = { ...roleCounts, [after.role]: (roleCounts[after.role] ?? 0) + 1 };
    return Object.entries(updated)
      .filter(([, c]) => c > 0)
      .map(([r, c]) => `${c} ${ROLE_OPTIONS.find(o => o.code === r)?.label ?? r}`)
      .join(", ");
  };

  // Missing reviewer
  if (!roleCounts["reviewer"]) {
    const defaults = getDefaultConfig("reviewer");
    proposals.push({
      id: makeId(), capabilityId, capabilityName,
      suggestedRole: "reviewer", suggestedSeniority: "Senior",
      primaryStack: capStack.slice(0, 3), secondaryStack: [],
      traits: {
        riskTolerance: defaults.riskTolerance ?? "low",
        strictness: defaults.strictness ?? 5,
        refactorBias: defaults.refactorBias as BiasLevel ?? "high",
        escalationThreshold: defaults.escalationThreshold as RiskTolerance ?? "low",
        speedVsQuality: defaults.speedVsQuality ?? 90,
        tokenEfficiency: defaults.tokenEfficiency ?? 70,
        testCoverageBias: defaults.testCoverageBias as BiasLevel ?? "high",
        documentationBias: defaults.documentationBias as BiasLevel ?? "high",
      },
      rationale: "No Reviewer in capability. Every team requires at least one Reviewer to enforce quality gates and prevent defect propagation.",
      teamBalanceImpact: `After hiring: ${compose({ role: "reviewer", seniority: "Senior" })}`,
      expectedImprovement: "Reduced rework rate by enforcing review before merge. Expected bug escape reduction: 30–50%.",
      status: "pending",
    });
  }

  // Missing QA
  if (!roleCounts["qa_agent"]) {
    const defaults = getDefaultConfig("qa_agent");
    proposals.push({
      id: makeId(), capabilityId, capabilityName,
      suggestedRole: "qa_agent", suggestedSeniority: "Middle",
      primaryStack: capStack.slice(0, 3), secondaryStack: [],
      traits: {
        riskTolerance: defaults.riskTolerance ?? "low",
        strictness: defaults.strictness ?? 5,
        refactorBias: defaults.refactorBias as BiasLevel ?? "balanced",
        escalationThreshold: defaults.escalationThreshold as RiskTolerance ?? "low",
        speedVsQuality: defaults.speedVsQuality ?? 85,
        tokenEfficiency: defaults.tokenEfficiency ?? 60,
        testCoverageBias: defaults.testCoverageBias as BiasLevel ?? "high",
        documentationBias: defaults.documentationBias as BiasLevel ?? "balanced",
      },
      rationale: "No QA Agent in capability. Automated test coverage requires a dedicated QA to catch integration failures and regressions.",
      teamBalanceImpact: `After hiring: ${compose({ role: "qa_agent", seniority: "Middle" })}`,
      expectedImprovement: "Test coverage increase from 0% to 60%+ baseline. Earlier defect detection in pipeline.",
      status: "pending",
    });
  }

  // Missing senior/lead
  if (!seniorityCounts["Senior"] && !seniorityCounts["Lead"] && currentMembers.length > 0) {
    const mostNeeded = !roleCounts["backend_architect"] ? "backend_architect" : !roleCounts["solution_architect"] ? "solution_architect" : "backend_implementer";
    const defaults = getDefaultConfig(mostNeeded);
    proposals.push({
      id: makeId(), capabilityId, capabilityName,
      suggestedRole: mostNeeded, suggestedSeniority: "Senior",
      primaryStack: capStack.slice(0, 4), secondaryStack: capStack.slice(4, 6),
      traits: {
        riskTolerance: defaults.riskTolerance ?? "low",
        strictness: defaults.strictness ?? 4,
        refactorBias: defaults.refactorBias as BiasLevel ?? "balanced",
        escalationThreshold: defaults.escalationThreshold as RiskTolerance ?? "medium",
        speedVsQuality: defaults.speedVsQuality ?? 75,
        tokenEfficiency: defaults.tokenEfficiency ?? 65,
        testCoverageBias: defaults.testCoverageBias as BiasLevel ?? "high",
        documentationBias: defaults.documentationBias as BiasLevel ?? "high",
      },
      rationale: "No Senior or Lead in capability. At least one senior-level employee is required for architectural decisions and escalation handling.",
      teamBalanceImpact: `After hiring: ${compose({ role: mostNeeded, seniority: "Senior" })}`,
      expectedImprovement: "Improved decision quality on architecture. Reduced escalation latency.",
      riskFlag: "No senior oversight increases risk of technical debt accumulation",
      status: "pending",
    });
  }

  // High rework rate detected
  const avgBugRate = currentMembers.length > 0
    ? currentMembers.reduce((s, m) => s + (m.bugRate ?? 0), 0) / currentMembers.length : 0;
  if (avgBugRate > 0.2 && !proposals.some(p => p.suggestedRole === "reviewer")) {
    proposals.push({
      id: makeId(), capabilityId, capabilityName,
      suggestedRole: "reviewer", suggestedSeniority: "Senior",
      primaryStack: capStack.slice(0, 3), secondaryStack: [],
      traits: {
        riskTolerance: "low", strictness: 5, refactorBias: "high",
        escalationThreshold: "low", speedVsQuality: 95, tokenEfficiency: 70,
        testCoverageBias: "high", documentationBias: "high",
      },
      rationale: `Team average bug rate is ${Math.round(avgBugRate * 100)}%. An additional Senior Reviewer will enforce stricter review gates.`,
      teamBalanceImpact: `After hiring: ${compose({ role: "reviewer", seniority: "Senior" })}`,
      expectedImprovement: "Projected 40% reduction in rework cycles through pre-merge review enforcement.",
      riskFlag: `Current bug rate ${Math.round(avgBugRate * 100)}% exceeds 20% threshold`,
      status: "pending",
    });
  }

  return proposals;
}

// ── Helpers ──
export function riskColor(risk: RiskTolerance): string {
  return risk === "high" ? "text-destructive" : risk === "low" ? "text-status-green" : "text-status-amber";
}

export function riskBg(risk: RiskTolerance): string {
  return risk === "high" ? "bg-destructive/10" : risk === "low" ? "bg-status-green/10" : "bg-status-amber/10";
}

export function biasChipClass(level: BiasLevel): string {
  return level === "high" ? "bg-status-blue/10 text-status-blue" : level === "low" ? "bg-secondary text-muted-foreground" : "bg-primary/5 text-foreground";
}

export function strictnessLabel(v: number): string {
  if (v <= 1) return "Lenient";
  if (v <= 2) return "Relaxed";
  if (v <= 3) return "Moderate";
  if (v <= 4) return "Strict";
  return "Maximum";
}

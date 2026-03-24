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

// ── Employee Status States ──
export const EMPLOYEE_STATUSES = [
  "active", "onboarding", "probation", "under_review", "suspended", "inactive", "terminated",
] as const;
export type EmployeeStatus = typeof EMPLOYEE_STATUSES[number];

export const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active:       { label: "Active",       color: "text-status-green",     bg: "bg-status-green/10", dot: "bg-status-green" },
  onboarding:   { label: "Onboarding",   color: "text-status-blue",      bg: "bg-status-blue/10",  dot: "bg-status-blue" },
  probation:    { label: "Probation",     color: "text-status-amber",     bg: "bg-status-amber/10", dot: "bg-status-amber" },
  under_review: { label: "Under Review",  color: "text-lifecycle-review", bg: "bg-lifecycle-review/10", dot: "bg-lifecycle-review" },
  suspended:    { label: "Suspended",     color: "text-destructive",      bg: "bg-destructive/10",  dot: "bg-destructive" },
  inactive:     { label: "Inactive",      color: "text-muted-foreground", bg: "bg-secondary",       dot: "bg-muted-foreground" },
  terminated:   { label: "Terminated",    color: "text-muted-foreground", bg: "bg-secondary",       dot: "bg-muted-foreground/50" },
};

// ── Employee Configuration (full operational profile) ──
export interface EmployeeConfig {
  name: string;
  roleCode: string;
  seniority: Seniority;
  primaryStack: string[];
  secondaryStack: string[];
  riskTolerance: RiskTolerance;
  strictness: number;
  refactorBias: BiasLevel;
  escalationThreshold: RiskTolerance;
  speedVsQuality: number;
  tokenEfficiency: number;
  testCoverageBias: BiasLevel;
  documentationBias: BiasLevel;
  mayDeploy: boolean;
}

// ── Default config by role ──
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

// ── HR Hiring Proposal (existing) ──
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

// ═════════════════════════════════════════════════════════════
// HR PERFORMANCE PROPOSAL — Reviews, Probation, Replacement
// ═════════════════════════════════════════════════════════════

export type PerformanceProposalType =
  | "probation"
  | "role_adjustment"
  | "stack_adjustment"
  | "replacement"
  | "remove_from_capability"
  | "restore_active";

export interface EmployeeMetricsSnapshot {
  successRate: number;       // 0–1
  reviewPassRate: number;    // 0–1
  reworkRate: number;        // 0–1
  escalationRate: number;    // 0–1
  bugRate: number;           // 0–1
  tokenEfficiency: number;   // 0–1
  reputationScore: number;   // 0–1
}

export interface HRPerformanceProposal {
  id: string;
  employeeId: string;
  employeeName: string;
  capabilityId: string;
  capabilityName: string;
  roleCode: string;
  type: PerformanceProposalType;
  metrics: EmployeeMetricsSnapshot;
  performanceScore: number;  // 0–1 weighted blend
  issue: string;             // identified issue description
  suggestedAction: string;
  projectedTeamImpact: string;
  riskIfIgnored: string;
  // For replacement proposals
  replacementConfig?: {
    suggestedRole: string;
    suggestedSeniority: Seniority;
    primaryStack: string[];
    traits: HRProposal["traits"];
    projectedImprovement: string;
  };
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
}

// ── Performance Score Calculator ──
// Weighted blend: success(30) + reviewPass(20) + lowRework(15) + lowEscalation(10) + eval(15) + tokenEff(10)
export function computeHRPerformanceScore(m: EmployeeMetricsSnapshot): number {
  const score =
    m.successRate * 0.30 +
    m.reviewPassRate * 0.20 +
    (1 - m.reworkRate) * 0.15 +
    (1 - m.escalationRate) * 0.10 +
    (1 - m.bugRate) * 0.15 +
    m.tokenEfficiency * 0.10;
  return Math.max(0, Math.min(1, score));
}

// ── Thresholds ──
const THRESHOLDS = {
  successRate: 0.6,
  reworkRate: 0.25,
  escalationRate: 0.3,
  bugRate: 0.25,
  reviewPassRate: 0.65,
  performanceScore: 0.5,
  probationWindow: 5, // tasks
};

// ── Generate Performance Proposals ──
export function generatePerformanceProposals(
  employees: Array<{
    id: string;
    name: string;
    role_code: string;
    team_id: string | null;
    status: string;
    success_rate: number;
    bug_rate: number;
    escalation_rate: number;
    reputation_score: number;
    avg_cost: number;
    avg_latency: number;
  }>,
  departments: Array<{ id: string; name: string }>,
  allRoles: Array<{ id: string; team_id: string | null; code: string; skill_profile: any }>,
): HRPerformanceProposal[] {
  const proposals: HRPerformanceProposal[] = [];
  const deptMap = Object.fromEntries(departments.map(d => [d.id, d.name]));

  for (const emp of employees) {
    if (emp.status === "terminated" || emp.status === "inactive") continue;

    // Synthesize metrics (some derived from available data)
    const metrics: EmployeeMetricsSnapshot = {
      successRate: emp.success_rate ?? 0,
      reviewPassRate: Math.max(0, 1 - (emp.bug_rate ?? 0) * 1.2), // proxy
      reworkRate: (emp.bug_rate ?? 0) * 0.8, // proxy from bug rate
      escalationRate: emp.escalation_rate ?? 0,
      bugRate: emp.bug_rate ?? 0,
      tokenEfficiency: emp.avg_cost > 0 ? Math.max(0, 1 - Math.min(emp.avg_cost / 0.5, 1)) : 0.5,
      reputationScore: emp.reputation_score ?? 0,
    };

    const perfScore = computeHRPerformanceScore(metrics);
    const capName = emp.team_id ? (deptMap[emp.team_id] ?? "Unknown") : "Unassigned";
    const issues: string[] = [];

    if (metrics.successRate < THRESHOLDS.successRate) {
      issues.push(`Success rate ${(metrics.successRate * 100).toFixed(0)}% < ${THRESHOLDS.successRate * 100}%`);
    }
    if (metrics.reworkRate > THRESHOLDS.reworkRate) {
      issues.push(`Rework rate ${(metrics.reworkRate * 100).toFixed(0)}% > ${THRESHOLDS.reworkRate * 100}%`);
    }
    if (metrics.escalationRate > THRESHOLDS.escalationRate) {
      issues.push(`Escalation rate ${(metrics.escalationRate * 100).toFixed(0)}% > ${THRESHOLDS.escalationRate * 100}%`);
    }
    if (metrics.bugRate > THRESHOLDS.bugRate) {
      issues.push(`Bug rate ${(metrics.bugRate * 100).toFixed(0)}% > ${THRESHOLDS.bugRate * 100}%`);
    }

    if (issues.length === 0) {
      // Check for probation → restore
      if (emp.status === "probation" && perfScore > 0.65) {
        proposals.push({
          id: crypto.randomUUID(),
          employeeId: emp.id, employeeName: emp.name,
          capabilityId: emp.team_id ?? "", capabilityName: capName,
          roleCode: emp.role_code, type: "restore_active",
          metrics, performanceScore: perfScore,
          issue: "Performance has improved during probation period",
          suggestedAction: `Restore ${emp.name} to Active status. Performance score: ${(perfScore * 100).toFixed(0)}%`,
          projectedTeamImpact: "Team stability improves with confirmed active member",
          riskIfIgnored: "Extended probation may demotivate otherwise recovered agent",
          status: "pending",
        });
      }
      continue;
    }

    // Determine proposal type based on severity
    const severity = issues.length;
    let type: PerformanceProposalType;
    let suggestedAction: string;
    let riskIfIgnored: string;

    if (perfScore < 0.3 || severity >= 3) {
      // Severe — propose replacement
      type = "replacement";
      const role = allRoles.find(r => r.team_id === emp.team_id && r.code === emp.role_code);
      const sp = role?.skill_profile as any;
      const defaults = getDefaultConfig(emp.role_code);
      suggestedAction = `Replace ${emp.name} with a new ${ROLE_OPTIONS.find(r => r.code === emp.role_code)?.label ?? emp.role_code}. Multiple critical metrics below threshold.`;
      riskIfIgnored = `Continued delivery failures. Current performance score: ${(perfScore * 100).toFixed(0)}%. Team output at risk.`;

      proposals.push({
        id: crypto.randomUUID(),
        employeeId: emp.id, employeeName: emp.name,
        capabilityId: emp.team_id ?? "", capabilityName: capName,
        roleCode: emp.role_code, type, metrics, performanceScore: perfScore,
        issue: issues.join("; "),
        suggestedAction, riskIfIgnored,
        projectedTeamImpact: "Replacement restores team's average performance. Transition requires onboarding period.",
        replacementConfig: {
          suggestedRole: emp.role_code,
          suggestedSeniority: (sp?.seniority === "Junior" ? "Middle" : sp?.seniority) ?? "Senior",
          primaryStack: sp?.primaryStack ?? [],
          traits: {
            riskTolerance: defaults.riskTolerance ?? "medium",
            strictness: defaults.strictness ?? 3,
            refactorBias: (defaults.refactorBias as BiasLevel) ?? "balanced",
            escalationThreshold: (defaults.escalationThreshold as RiskTolerance) ?? "medium",
            speedVsQuality: (defaults.speedVsQuality ?? 50) + 15, // bias toward quality
            tokenEfficiency: defaults.tokenEfficiency ?? 50,
            testCoverageBias: (defaults.testCoverageBias as BiasLevel) ?? "high",
            documentationBias: (defaults.documentationBias as BiasLevel) ?? "balanced",
          },
          projectedImprovement: `Expected ${Math.min(30, Math.round((1 - perfScore) * 40))}% improvement in team output with properly configured replacement.`,
        },
        status: "pending",
      });
    } else if (emp.status === "probation") {
      // Already on probation and not improved — propose removal
      type = "remove_from_capability";
      suggestedAction = `Remove ${emp.name} from capability. Probation period did not yield improvement.`;
      riskIfIgnored = "Continued underperformance drags team metrics. Rework cycles increase.";
      proposals.push({
        id: crypto.randomUUID(),
        employeeId: emp.id, employeeName: emp.name,
        capabilityId: emp.team_id ?? "", capabilityName: capName,
        roleCode: emp.role_code, type, metrics, performanceScore: perfScore,
        issue: issues.join("; "),
        suggestedAction, riskIfIgnored,
        projectedTeamImpact: "Team size decreases by 1. Hiring proposal should follow.",
        status: "pending",
      });
    } else if (severity >= 2 || perfScore < THRESHOLDS.performanceScore) {
      // Moderate — propose probation
      type = "probation";
      suggestedAction = `Move ${emp.name} to Probation. Monitor for ${THRESHOLDS.probationWindow} tasks. If improved, restore to Active.`;
      riskIfIgnored = `Without intervention, bug rate and rework will continue rising. Team delivery quality degrades.`;
      proposals.push({
        id: crypto.randomUUID(),
        employeeId: emp.id, employeeName: emp.name,
        capabilityId: emp.team_id ?? "", capabilityName: capName,
        roleCode: emp.role_code, type, metrics, performanceScore: perfScore,
        issue: issues.join("; "),
        suggestedAction, riskIfIgnored,
        projectedTeamImpact: "Employee enters monitored period. No immediate team change.",
        status: "pending",
      });
    } else {
      // Mild — single issue, suggest role/stack adjustment
      type = "role_adjustment";
      suggestedAction = `Review ${emp.name}'s role configuration. Consider adjusting operational traits to address: ${issues[0]}`;
      riskIfIgnored = "Minor issue may compound over time if unaddressed.";
      proposals.push({
        id: crypto.randomUUID(),
        employeeId: emp.id, employeeName: emp.name,
        capabilityId: emp.team_id ?? "", capabilityName: capName,
        roleCode: emp.role_code, type, metrics, performanceScore: perfScore,
        issue: issues.join("; "),
        suggestedAction, riskIfIgnored,
        projectedTeamImpact: "Trait adjustment may improve individual output without team disruption.",
        status: "pending",
      });
    }
  }

  return proposals;
}

// ── Team Balance Distribution ──
export interface TeamDistribution {
  seniority: Record<string, number>;
  riskTolerance: Record<string, number>;
  speedVsQuality: { speed: number; balanced: number; quality: number };
  roles: Record<string, number>;
}

export function computeTeamDistribution(
  members: Array<{ roleCode: string; seniority?: string; riskTolerance?: string; speedVsQuality?: number }>
): TeamDistribution {
  const dist: TeamDistribution = {
    seniority: {}, riskTolerance: {}, speedVsQuality: { speed: 0, balanced: 0, quality: 0 }, roles: {},
  };
  for (const m of members) {
    const sen = m.seniority ?? "Middle";
    dist.seniority[sen] = (dist.seniority[sen] ?? 0) + 1;
    const risk = m.riskTolerance ?? "medium";
    dist.riskTolerance[risk] = (dist.riskTolerance[risk] ?? 0) + 1;
    const sq = m.speedVsQuality ?? 50;
    if (sq < 35) dist.speedVsQuality.speed++;
    else if (sq > 65) dist.speedVsQuality.quality++;
    else dist.speedVsQuality.balanced++;
    dist.roles[m.roleCode] = (dist.roles[m.roleCode] ?? 0) + 1;
  }
  return dist;
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

  if (!roleCounts["reviewer"]) warnings.push({ type: "error", message: "Team must include at least one Reviewer" });
  if (!roleCounts["qa_agent"]) warnings.push({ type: "error", message: "Team must include at least one QA Agent" });
  if (!seniorityCounts["Senior"] && !seniorityCounts["Lead"]) warnings.push({ type: "error", message: "Team must include at least one Senior or Lead" });
  if ((seniorityCounts["Lead"] ?? 0) > 2) warnings.push({ type: "warning", message: `${seniorityCounts["Lead"]} Leads — consider balancing seniority` });
  if (highRiskCount / members.length > 0.4) warnings.push({ type: "warning", message: `${Math.round(highRiskCount / members.length * 100)}% high risk tolerance — exceeds 40% limit` });
  if (speedBiasedCount / members.length > 0.6) warnings.push({ type: "warning", message: `${Math.round(speedBiasedCount / members.length * 100)}% speed-biased — exceeds 60% limit` });

  return warnings;
}

// ── Generate HR Hiring Proposals ──
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
    return Object.entries(updated).filter(([, c]) => c > 0)
      .map(([r, c]) => `${c} ${ROLE_OPTIONS.find(o => o.code === r)?.label ?? r}`).join(", ");
  };

  if (!roleCounts["reviewer"]) {
    const d = getDefaultConfig("reviewer");
    proposals.push({ id: makeId(), capabilityId, capabilityName, suggestedRole: "reviewer", suggestedSeniority: "Senior",
      primaryStack: capStack.slice(0, 3), secondaryStack: [],
      traits: { riskTolerance: d.riskTolerance ?? "low", strictness: d.strictness ?? 5, refactorBias: d.refactorBias as BiasLevel ?? "high", escalationThreshold: d.escalationThreshold as RiskTolerance ?? "low", speedVsQuality: d.speedVsQuality ?? 90, tokenEfficiency: d.tokenEfficiency ?? 70, testCoverageBias: d.testCoverageBias as BiasLevel ?? "high", documentationBias: d.documentationBias as BiasLevel ?? "high" },
      rationale: "No Reviewer in capability. Required for quality gates.", teamBalanceImpact: `After hiring: ${compose({ role: "reviewer", seniority: "Senior" })}`,
      expectedImprovement: "Reduced rework rate. Expected bug escape reduction: 30–50%.", status: "pending" });
  }

  if (!roleCounts["qa_agent"]) {
    const d = getDefaultConfig("qa_agent");
    proposals.push({ id: makeId(), capabilityId, capabilityName, suggestedRole: "qa_agent", suggestedSeniority: "Middle",
      primaryStack: capStack.slice(0, 3), secondaryStack: [],
      traits: { riskTolerance: d.riskTolerance ?? "low", strictness: d.strictness ?? 5, refactorBias: d.refactorBias as BiasLevel ?? "balanced", escalationThreshold: d.escalationThreshold as RiskTolerance ?? "low", speedVsQuality: d.speedVsQuality ?? 85, tokenEfficiency: d.tokenEfficiency ?? 60, testCoverageBias: d.testCoverageBias as BiasLevel ?? "high", documentationBias: d.documentationBias as BiasLevel ?? "balanced" },
      rationale: "No QA Agent in capability. Required for test coverage.", teamBalanceImpact: `After hiring: ${compose({ role: "qa_agent", seniority: "Middle" })}`,
      expectedImprovement: "Test coverage increase from 0% to 60%+ baseline.", status: "pending" });
  }

  if (!seniorityCounts["Senior"] && !seniorityCounts["Lead"] && currentMembers.length > 0) {
    const mostNeeded = !roleCounts["backend_architect"] ? "backend_architect" : !roleCounts["solution_architect"] ? "solution_architect" : "backend_implementer";
    const d = getDefaultConfig(mostNeeded);
    proposals.push({ id: makeId(), capabilityId, capabilityName, suggestedRole: mostNeeded, suggestedSeniority: "Senior",
      primaryStack: capStack.slice(0, 4), secondaryStack: capStack.slice(4, 6),
      traits: { riskTolerance: d.riskTolerance ?? "low", strictness: d.strictness ?? 4, refactorBias: d.refactorBias as BiasLevel ?? "balanced", escalationThreshold: d.escalationThreshold as RiskTolerance ?? "medium", speedVsQuality: d.speedVsQuality ?? 75, tokenEfficiency: d.tokenEfficiency ?? 65, testCoverageBias: d.testCoverageBias as BiasLevel ?? "high", documentationBias: d.documentationBias as BiasLevel ?? "high" },
      rationale: "No Senior or Lead in capability. Required for architecture decisions.", teamBalanceImpact: `After hiring: ${compose({ role: mostNeeded, seniority: "Senior" })}`,
      expectedImprovement: "Improved decision quality. Reduced escalation latency.", riskFlag: "No senior oversight", status: "pending" });
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

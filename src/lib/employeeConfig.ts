// HR Configuration Engine — Employee Operational Traits Schema
// All traits affect delivery behavior. No fictional backstories.

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

// ── MBTI types (affects decision-making and communication style) ──
export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;
export type MbtiType = typeof MBTI_TYPES[number];

// MBTI → operational impact mapping
export const MBTI_TRAITS: Record<MbtiType, { label: string; bias: string }> = {
  INTJ: { label: "Architect", bias: "Strategic planning, systems thinking" },
  INTP: { label: "Logician", bias: "Deep analysis, edge-case coverage" },
  ENTJ: { label: "Commander", bias: "Fast decisions, deadline focus" },
  ENTP: { label: "Debater", bias: "Alternative approaches, refactoring" },
  INFJ: { label: "Advocate", bias: "User empathy, consistency" },
  INFP: { label: "Mediator", bias: "Creative solutions, flexibility" },
  ENFJ: { label: "Protagonist", bias: "Team coordination, documentation" },
  ENFP: { label: "Campaigner", bias: "Innovation, prototyping speed" },
  ISTJ: { label: "Logistician", bias: "Process adherence, test coverage" },
  ISFJ: { label: "Defender", bias: "Stability, backward compatibility" },
  ESTJ: { label: "Executive", bias: "Enforcement, standards compliance" },
  ESFJ: { label: "Consul", bias: "Integration, API consistency" },
  ISTP: { label: "Virtuoso", bias: "Pragmatic fixes, minimal code" },
  ISFP: { label: "Adventurer", bias: "UI polish, visual quality" },
  ESTP: { label: "Entrepreneur", bias: "Rapid iteration, MVP focus" },
  ESFP: { label: "Entertainer", bias: "User experience, demo readiness" },
};

// ── Nationality traits (Gustave Le Bon — crowd psychology applied to work style) ──
// These map cultural work patterns to operational parameters, not stereotypes.
export const NATIONALITY_TRAITS = [
  { code: "germanic", label: "Germanic", bias: "Precision, process rigor, thorough documentation", defaultStrictness: 8, defaultRefactorBias: 6 },
  { code: "anglo_saxon", label: "Anglo-Saxon", bias: "Pragmatism, ship-fast mentality, empirical testing", defaultStrictness: 5, defaultRefactorBias: 4 },
  { code: "scandinavian", label: "Scandinavian", bias: "Consensus-driven, balanced quality/speed, minimal hierarchy", defaultStrictness: 6, defaultRefactorBias: 7 },
  { code: "japanese", label: "Japanese", bias: "Perfectionism, zero-defect tolerance, deep review cycles", defaultStrictness: 9, defaultRefactorBias: 5 },
  { code: "french", label: "French", bias: "Architectural elegance, strong opinions on design, theory-first", defaultStrictness: 7, defaultRefactorBias: 8 },
  { code: "american", label: "American", bias: "Move fast, iterate, demo-driven development", defaultStrictness: 4, defaultRefactorBias: 3 },
  { code: "korean", label: "Korean", bias: "High output velocity, competitive performance, deadline-focused", defaultStrictness: 7, defaultRefactorBias: 4 },
  { code: "israeli", label: "Israeli", bias: "Challenge assumptions, flat hierarchy, unconventional solutions", defaultStrictness: 5, defaultRefactorBias: 6 },
  { code: "swiss", label: "Swiss", bias: "Reliability, modular systems, defensive coding", defaultStrictness: 9, defaultRefactorBias: 7 },
  { code: "brazilian", label: "Brazilian", bias: "Adaptability, creative problem-solving, rapid prototyping", defaultStrictness: 4, defaultRefactorBias: 5 },
] as const;
export type NationalityCode = typeof NATIONALITY_TRAITS[number]["code"];

// ── Employee Configuration (full operational profile) ──
export interface EmployeeConfig {
  // Identity
  name: string;
  roleCode: string;
  seniority: Seniority;
  mbtiType: MbtiType;
  nationalityCode: NationalityCode;

  // Stack
  primaryStack: string[];
  secondaryStack: string[];

  // Operational biases (1–10 scale)
  riskTolerance: RiskTolerance;
  strictnessLevel: number;      // 1=lenient, 10=strict — affects review depth
  refactorBias: number;         // 1=leave-as-is, 10=always-refactor
  escalationThreshold: number;  // 1=escalate-everything, 10=handle-independently
  speedQualityWeight: number;   // 1=speed-first, 10=quality-first
  tokenEfficiency: number;      // 1=verbose, 10=minimal-tokens
  testCoverageBias: number;     // 1=skip-tests, 10=full-coverage
  documentationBias: number;    // 1=no-docs, 10=document-everything

  // Permissions
  mayDeploy: boolean;
}

// ── Default config by role ──
export function getDefaultConfig(roleCode: string): Partial<EmployeeConfig> {
  const defaults: Record<string, Partial<EmployeeConfig>> = {
    product_strategist:  { mbtiType: "ENFJ", nationalityCode: "french", strictnessLevel: 5, refactorBias: 3, escalationThreshold: 4, speedQualityWeight: 5, tokenEfficiency: 6, testCoverageBias: 3, documentationBias: 9, riskTolerance: "medium" },
    solution_architect:  { mbtiType: "INTJ", nationalityCode: "swiss", strictnessLevel: 8, refactorBias: 7, escalationThreshold: 6, speedQualityWeight: 8, tokenEfficiency: 7, testCoverageBias: 6, documentationBias: 8, riskTolerance: "low" },
    backend_architect:   { mbtiType: "INTP", nationalityCode: "germanic", strictnessLevel: 8, refactorBias: 6, escalationThreshold: 7, speedQualityWeight: 8, tokenEfficiency: 8, testCoverageBias: 7, documentationBias: 7, riskTolerance: "low" },
    backend_implementer: { mbtiType: "ISTP", nationalityCode: "anglo_saxon", strictnessLevel: 5, refactorBias: 4, escalationThreshold: 6, speedQualityWeight: 5, tokenEfficiency: 6, testCoverageBias: 6, documentationBias: 5, riskTolerance: "medium" },
    frontend_builder:    { mbtiType: "ISFP", nationalityCode: "scandinavian", strictnessLevel: 5, refactorBias: 5, escalationThreshold: 5, speedQualityWeight: 5, tokenEfficiency: 5, testCoverageBias: 5, documentationBias: 4, riskTolerance: "medium" },
    reviewer:            { mbtiType: "ISTJ", nationalityCode: "japanese", strictnessLevel: 9, refactorBias: 7, escalationThreshold: 3, speedQualityWeight: 9, tokenEfficiency: 8, testCoverageBias: 9, documentationBias: 7, riskTolerance: "low" },
    qa_agent:            { mbtiType: "ESTJ", nationalityCode: "germanic", strictnessLevel: 9, refactorBias: 5, escalationThreshold: 4, speedQualityWeight: 9, tokenEfficiency: 7, testCoverageBias: 10, documentationBias: 6, riskTolerance: "low" },
    release_coordinator: { mbtiType: "ENTJ", nationalityCode: "american", strictnessLevel: 6, refactorBias: 3, escalationThreshold: 5, speedQualityWeight: 6, tokenEfficiency: 7, testCoverageBias: 7, documentationBias: 6, riskTolerance: "medium" },
  };
  return defaults[roleCode] ?? {
    mbtiType: "INTJ", nationalityCode: "anglo_saxon",
    strictnessLevel: 5, refactorBias: 5, escalationThreshold: 5,
    speedQualityWeight: 5, tokenEfficiency: 5, testCoverageBias: 5,
    documentationBias: 5, riskTolerance: "medium" as RiskTolerance,
  };
}

// ── Team Balance Validation ──
export interface TeamBalanceWarning {
  type: "error" | "warning";
  message: string;
}

export function validateTeamBalance(members: { roleCode: string; seniority: string; speedQualityWeight?: number }[]): TeamBalanceWarning[] {
  const warnings: TeamBalanceWarning[] = [];
  if (members.length === 0) return warnings;

  const roleCounts: Record<string, number> = {};
  const seniorityCounts: Record<string, number> = {};
  for (const m of members) {
    roleCounts[m.roleCode] = (roleCounts[m.roleCode] ?? 0) + 1;
    seniorityCounts[m.seniority] = (seniorityCounts[m.seniority] ?? 0) + 1;
  }

  // Must have at least one reviewer
  if (!roleCounts["reviewer"]) {
    warnings.push({ type: "error", message: "Team must include at least one Reviewer" });
  }

  // Must have at least one QA
  if (!roleCounts["qa_agent"]) {
    warnings.push({ type: "error", message: "Team must include at least one QA Agent" });
  }

  // Max 2 leads per team
  if ((seniorityCounts["Lead"] ?? 0) > 2) {
    warnings.push({ type: "warning", message: `${seniorityCounts["Lead"]} Leads — consider balancing seniority` });
  }

  // Speed/quality balance check
  const withWeight = members.filter((m) => m.speedQualityWeight != null);
  if (withWeight.length >= 3) {
    const avg = withWeight.reduce((s, m) => s + (m.speedQualityWeight ?? 5), 0) / withWeight.length;
    if (avg < 3) warnings.push({ type: "warning", message: "Team is heavily speed-biased — quality risk" });
    if (avg > 8) warnings.push({ type: "warning", message: "Team is heavily quality-biased — velocity risk" });
  }

  return warnings;
}

// ── Bias label helpers ──
export function biasLabel(value: number, lowLabel: string, highLabel: string): string {
  if (value <= 3) return lowLabel;
  if (value >= 8) return highLabel;
  return "Balanced";
}

export function riskColor(risk: RiskTolerance): string {
  return risk === "high" ? "text-destructive" : risk === "low" ? "text-status-green" : "text-status-amber";
}

export function riskBg(risk: RiskTolerance): string {
  return risk === "high" ? "bg-destructive/10" : risk === "low" ? "bg-status-green/10" : "bg-status-amber/10";
}

// Instinct Settings — explicit founder-controlled agent behavior preferences

export type InstinctLevel = "low" | "medium" | "high";
export type EscalationTiming = "early" | "balanced" | "late";
export type ResearchMode = "off" | "balanced" | "strong";

export interface InstinctSetting {
  key: string;
  label: string;
  description: string;
  type: "level" | "escalation" | "research";
  value: InstinctLevel | EscalationTiming | ResearchMode;
}

export const DEFAULT_INSTINCT_SETTINGS: InstinctSetting[] = [
  {
    key: "review_strictness",
    label: "Review Strictness",
    description: "How thorough this agent is when reviewing artifacts and outputs",
    type: "level",
    value: "medium",
  },
  {
    key: "security_sensitivity",
    label: "Security Sensitivity",
    description: "How aggressively this agent flags potential security concerns",
    type: "level",
    value: "medium",
  },
  {
    key: "edge_case_vigilance",
    label: "Edge-case Vigilance",
    description: "How much attention to rare or boundary conditions",
    type: "level",
    value: "medium",
  },
  {
    key: "escalation_timing",
    label: "Escalation Discipline",
    description: "When to escalate to the founder — sooner or later",
    type: "escalation",
    value: "balanced",
  },
  {
    key: "research_before_action",
    label: "Research Before Action",
    description: "Whether to investigate context thoroughly before implementing",
    type: "research",
    value: "balanced",
  },
];

/** Synthesize instinct settings into a guidance text block */
export function synthesizeInstinctGuidance(settings: InstinctSetting[]): string {
  const lines: string[] = [];
  for (const s of settings) {
    if (s.key === "review_strictness") {
      const map = { low: "Accept work that meets basic criteria", medium: "Check for correctness and adherence to contracts", high: "Demand evidence for every claim and verify edge cases" };
      lines.push(`Review: ${map[s.value as InstinctLevel]}`);
    }
    if (s.key === "security_sensitivity") {
      const map = { low: "Flag only obvious security issues", medium: "Check for common vulnerability patterns", high: "Treat every input/output boundary as potentially hostile" };
      lines.push(`Security: ${map[s.value as InstinctLevel]}`);
    }
    if (s.key === "edge_case_vigilance") {
      const map = { low: "Focus on the happy path", medium: "Consider likely edge cases", high: "Systematically enumerate boundary conditions" };
      lines.push(`Edge cases: ${map[s.value as InstinctLevel]}`);
    }
    if (s.key === "escalation_timing") {
      const map = { early: "Escalate at first sign of ambiguity", balanced: "Escalate when confidence drops below 70%", late: "Attempt resolution independently before escalating" };
      lines.push(`Escalation: ${map[s.value as EscalationTiming]}`);
    }
    if (s.key === "research_before_action") {
      const map = { off: "Proceed directly to implementation", balanced: "Review relevant context before starting", strong: "Conduct thorough research and document findings before any implementation" };
      lines.push(`Research: ${map[s.value as ResearchMode]}`);
    }
  }
  return lines.join("\n");
}

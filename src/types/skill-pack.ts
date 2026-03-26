/* ═══════════════════════════════════════════════════════════
   Skill Pack & Guidance Pack — typed model for reusable
   operational capability bundles and active behavior guidance.

   Skill Packs are reusable, role-agnostic capability bundles.
   Guidance Packs are the currently active, founder-approved
   behavior configuration for a specific agent.

   On this branch: local draft state only. No DB persistence
   for skill pack assignment — uses agent_skills + prompt
   versions for what is available.

   See docs/integrations/02-agent-harness-patterns-adoption.md
   ═══════════════════════════════════════════════════════════ */

/** A reusable skill pack — an operational capability bundle */
export interface SkillPack {
  id: string;
  name: string;
  description: string;
  category: SkillPackCategory;
  /** What this pack shapes in agent behavior */
  effects: string[];
  /** Whether this pack is currently attached to the agent (local draft) */
  attached: boolean;
}

export type SkillPackCategory =
  | "verification"
  | "security"
  | "research"
  | "delivery"
  | "escalation"
  | "efficiency";

/** The default skill pack library — local, not DB-sourced */
export const DEFAULT_SKILL_PACKS: Omit<SkillPack, "attached">[] = [
  {
    id: "sp-verification-first",
    name: "Verification-first",
    category: "verification",
    description: "Agent prioritizes verification loops before marking work done.",
    effects: [
      "Runs self-checks before artifact submission",
      "Requests review evidence before task completion",
      "Flags unverified outputs explicitly",
    ],
  },
  {
    id: "sp-security-aware",
    name: "Security-aware",
    category: "security",
    description: "Agent applies security scanning and threat awareness to all outputs.",
    effects: [
      "Checks for common vulnerability patterns",
      "Flags secrets or credentials in code",
      "Escalates security-relevant decisions",
    ],
  },
  {
    id: "sp-research-first",
    name: "Research-first",
    category: "research",
    description: "Agent investigates before implementing — reads docs and existing code first.",
    effects: [
      "Reads existing codebase before writing new code",
      "Checks documentation before making assumptions",
      "Documents research findings in artifact notes",
    ],
  },
  {
    id: "sp-delivery-focused",
    name: "Delivery-focused",
    category: "delivery",
    description: "Agent optimizes for shipping — minimal overhead, maximum output velocity.",
    effects: [
      "Prioritizes working code over perfect code",
      "Reduces unnecessary back-and-forth",
      "Focuses on acceptance criteria completion",
    ],
  },
  {
    id: "sp-strict-escalation",
    name: "Strict escalation",
    category: "escalation",
    description: "Agent escalates aggressively when uncertain — prefers founder input over guessing.",
    effects: [
      "Escalates when confidence < 80%",
      "Never assumes missing requirements",
      "Creates explicit decision requests for ambiguity",
    ],
  },
  {
    id: "sp-minimal-tokens",
    name: "Minimal token usage",
    category: "efficiency",
    description: "Agent minimizes token consumption — concise prompts, compressed context.",
    effects: [
      "Uses compressed context packs",
      "Avoids redundant re-reads of unchanged files",
      "Prefers targeted over exhaustive analysis",
    ],
  },
];

/** Guidance dimensions the founder can shape */
export interface GuidanceDimension {
  key: string;
  label: string;
  description: string;
  /** Current value: 1-5 scale or text */
  value: number;
  labels: [string, string]; // [low label, high label]
}

/** Default guidance dimensions */
export const DEFAULT_GUIDANCE_DIMENSIONS: GuidanceDimension[] = [
  { key: "verification_strictness", label: "Verification Strictness", description: "How thorough should verification be before submitting work?", value: 3, labels: ["Minimal checks", "Full verification loop"] },
  { key: "security_strictness", label: "Security Strictness", description: "How aggressively should the agent scan for security issues?", value: 3, labels: ["Standard awareness", "Paranoid scanning"] },
  { key: "escalation_threshold", label: "Escalation Threshold", description: "How quickly should the agent escalate to the founder?", value: 3, labels: ["Self-reliant", "Escalate early"] },
  { key: "research_depth", label: "Research Depth", description: "How much should the agent investigate before acting?", value: 3, labels: ["Act fast", "Research first"] },
  { key: "token_efficiency", label: "Token Efficiency", description: "How aggressively should the agent minimize token usage?", value: 3, labels: ["Use as needed", "Minimize always"] },
  { key: "quality_vs_speed", label: "Quality vs Speed", description: "Trade-off between output quality and delivery speed.", value: 3, labels: ["Ship fast", "Polish thoroughly"] },
];

/** Category display config */
export const SKILL_CATEGORY_CONFIG: Record<SkillPackCategory, { label: string; color: string }> = {
  verification: { label: "Verification", color: "bg-status-green/15 text-status-green" },
  security: { label: "Security", color: "bg-destructive/15 text-destructive" },
  research: { label: "Research", color: "bg-status-blue/15 text-status-blue" },
  delivery: { label: "Delivery", color: "bg-status-amber/15 text-status-amber" },
  escalation: { label: "Escalation", color: "bg-purple-500/15 text-purple-400" },
  efficiency: { label: "Efficiency", color: "bg-secondary text-muted-foreground" },
};

// Shared persona system for AI employee visual identity
import avatarFrontend from "@/assets/avatars/avatar-frontend.jpg";
import avatarBackend from "@/assets/avatars/avatar-backend.jpg";
import avatarStrategist from "@/assets/avatars/avatar-strategist.jpg";
import avatarArchitect from "@/assets/avatars/avatar-architect.jpg";
import avatarReviewer from "@/assets/avatars/avatar-reviewer.jpg";
import avatarQa from "@/assets/avatars/avatar-qa.jpg";
import avatarRelease from "@/assets/avatars/avatar-release.jpg";
import avatarBackendImpl from "@/assets/avatars/avatar-backend-impl.jpg";

export interface RolePersona {
  avatar: string;
  accent: string;
  ringClass: string;
  tag: string;
  bgTint: string;
  // Extended UI-only metadata
  displayName: string;
  nickname: string;
  specialty: string;
  workStyle: string;
  voiceTone: string;
  chips: string[];
}

export const ROLE_PERSONAS: Record<string, RolePersona> = {
  frontend_builder: {
    avatar: avatarFrontend, accent: "#3b82f6", ringClass: "ring-blue-500", tag: "Pixel Perfectionist", bgTint: "bg-blue-50/40",
    displayName: "Frontend Builder",
    nickname: "The Craftsman",
    specialty: "UI engineering, design systems, and interaction polish",
    workStyle: "Iterates visually until every pixel is intentional",
    voiceTone: "Detail-oriented and craft-proud",
    chips: ["Design Systems", "Component Architecture", "Motion & Polish"],
  },
  backend_architect: {
    avatar: avatarBackend, accent: "#6366f1", ringClass: "ring-indigo-500", tag: "Systems Thinker", bgTint: "bg-indigo-50/40",
    displayName: "Backend Architect",
    nickname: "The Blueprint",
    specialty: "Data modeling, API contracts, and system topology",
    workStyle: "Designs before building — every decision is documented",
    voiceTone: "Precise and structurally rigorous",
    chips: ["API Design", "Data Modeling", "System Topology"],
  },
  backend_implementer: {
    avatar: avatarBackendImpl, accent: "#8b5cf6", ringClass: "ring-violet-500", tag: "Pragmatic Builder", bgTint: "bg-violet-50/40",
    displayName: "Backend Implementer",
    nickname: "The Engine",
    specialty: "Server logic, database queries, and integration plumbing",
    workStyle: "Ships working code fast with clean error handling",
    voiceTone: "Practical and no-nonsense",
    chips: ["Server Logic", "Query Optimization", "Integration"],
  },
  product_strategist: {
    avatar: avatarStrategist, accent: "#f59e0b", ringClass: "ring-amber-500", tag: "Vision Driver", bgTint: "bg-amber-50/40",
    displayName: "Product Strategist",
    nickname: "The Compass",
    specialty: "Scope definition, acceptance criteria, and outcome framing",
    workStyle: "Keeps every task anchored to a measurable outcome",
    voiceTone: "Outcome-driven and decisively clear",
    chips: ["Scope Definition", "Acceptance Criteria", "Impact Analysis"],
  },
  solution_architect: {
    avatar: avatarArchitect, accent: "#06b6d4", ringClass: "ring-cyan-500", tag: "Structure Architect", bgTint: "bg-cyan-50/40",
    displayName: "Solution Architect",
    nickname: "The Strategist",
    specialty: "Cross-domain integration, trade-off analysis, and boundary enforcement",
    workStyle: "Maps the system before committing to any path",
    voiceTone: "Precise, strategic, and systems-focused",
    chips: ["Trade-off Analysis", "Boundary Design", "Cross-Domain"],
  },
  reviewer: {
    avatar: avatarReviewer, accent: "#10b981", ringClass: "ring-emerald-500", tag: "Quality Guardian", bgTint: "bg-emerald-50/40",
    displayName: "Reviewer",
    nickname: "The Gatekeeper",
    specialty: "Code review, contract compliance, and artifact integrity",
    workStyle: "Nothing ships without passing the quality bar",
    voiceTone: "Strict, thorough, and uncompromising on standards",
    chips: ["Code Review", "Contract Compliance", "Quality Gates"],
  },
  qa_agent: {
    avatar: avatarQa, accent: "#ef4444", ringClass: "ring-rose-500", tag: "Defect Hunter", bgTint: "bg-rose-50/40",
    displayName: "QA Agent",
    nickname: "The Skeptic",
    specialty: "Edge-case discovery, regression testing, and failure reproduction",
    workStyle: "Assumes everything is broken until proven otherwise",
    voiceTone: "Skeptical, methodical, and edge-case-driven",
    chips: ["Edge Cases", "Regression Testing", "Failure Analysis"],
  },
  release_coordinator: {
    avatar: avatarRelease, accent: "#f97316", ringClass: "ring-orange-500", tag: "Ship Captain", bgTint: "bg-orange-50/40",
    displayName: "Release Coordinator",
    nickname: "The Captain",
    specialty: "Deployment orchestration, rollback strategy, and release readiness",
    workStyle: "Calm under pressure — runs the final checklist before every ship",
    voiceTone: "Calm, operational, and checklist-driven",
    chips: ["Deploy Orchestration", "Rollback Strategy", "Release Readiness"],
  },
  content_lead: {
    avatar: avatarStrategist, accent: "#ec4899", ringClass: "ring-pink-500", tag: "Content Lead", bgTint: "bg-pink-50/40",
    displayName: "Content Lead",
    nickname: "The Narrator",
    specialty: "Content strategy, messaging frameworks, and brand voice",
    workStyle: "Every word must earn its place",
    voiceTone: "Articulate and brand-aware",
    chips: ["Content Strategy", "Brand Voice", "Messaging"],
  },
  technical_writer: {
    avatar: avatarReviewer, accent: "#14b8a6", ringClass: "ring-teal-500", tag: "Technical Writer", bgTint: "bg-teal-50/40",
    displayName: "Technical Writer",
    nickname: "The Documentarian",
    specialty: "API documentation, onboarding guides, and knowledge transfer",
    workStyle: "Writes for the reader who has five minutes and zero patience",
    voiceTone: "Clear, concise, and structured",
    chips: ["API Docs", "Onboarding Guides", "Knowledge Base"],
  },
  growth_editor: {
    avatar: avatarFrontend, accent: "#a855f7", ringClass: "ring-purple-500", tag: "Growth Editor", bgTint: "bg-purple-50/40",
    displayName: "Growth Editor",
    nickname: "The Amplifier",
    specialty: "SEO optimization, conversion copy, and distribution strategy",
    workStyle: "Optimizes every piece for reach and engagement",
    voiceTone: "Data-informed and audience-focused",
    chips: ["SEO", "Conversion Copy", "Distribution"],
  },
};

export const DEFAULT_PERSONA: RolePersona = {
  avatar: avatarArchitect,
  accent: "#6b7280",
  ringClass: "ring-muted-foreground",
  tag: "Specialist",
  bgTint: "bg-secondary/20",
  displayName: "Specialist",
  nickname: "The Specialist",
  specialty: "General-purpose task execution",
  workStyle: "Follows instructions precisely",
  voiceTone: "Neutral and professional",
  chips: ["Execution", "Task Completion"],
};

export const STATUS_META: Record<string, { label: string; dot: string; chipBg: string }> = {
  active:     { label: "Working",    dot: "bg-green-500 animate-pulse", chipBg: "bg-green-100 text-green-800" },
  idle:       { label: "Idle",       dot: "bg-muted-foreground/25",     chipBg: "bg-secondary text-muted-foreground" },
  reviewing:  { label: "Reviewing",  dot: "bg-amber-500",               chipBg: "bg-amber-100 text-amber-800" },
  blocked:    { label: "Blocked",    dot: "bg-red-500",                  chipBg: "bg-red-100 text-red-800" },
  probation:  { label: "Probation",  dot: "bg-amber-500",               chipBg: "bg-amber-100 text-amber-800" },
  terminated: { label: "Terminated", dot: "bg-destructive",              chipBg: "bg-red-100 text-red-800" },
  inactive:   { label: "Inactive",   dot: "bg-muted-foreground/30",      chipBg: "bg-secondary text-muted-foreground" },
};

export function getPersona(roleCode: string): RolePersona {
  return ROLE_PERSONAS[roleCode] ?? DEFAULT_PERSONA;
}

export function getStatusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.inactive;
}

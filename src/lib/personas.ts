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
}

export const ROLE_PERSONAS: Record<string, RolePersona> = {
  frontend_builder:    { avatar: avatarFrontend,    accent: "#3b82f6", ringClass: "ring-blue-500",    tag: "Pixel Perfectionist",  bgTint: "bg-blue-50/40" },
  backend_architect:   { avatar: avatarBackend,     accent: "#6366f1", ringClass: "ring-indigo-500",  tag: "Systems Thinker",      bgTint: "bg-indigo-50/40" },
  backend_implementer: { avatar: avatarBackendImpl, accent: "#8b5cf6", ringClass: "ring-violet-500",  tag: "Pragmatic Builder",    bgTint: "bg-violet-50/40" },
  product_strategist:  { avatar: avatarStrategist,  accent: "#f59e0b", ringClass: "ring-amber-500",   tag: "Vision Driver",        bgTint: "bg-amber-50/40" },
  solution_architect:  { avatar: avatarArchitect,   accent: "#06b6d4", ringClass: "ring-cyan-500",    tag: "Structure Architect",  bgTint: "bg-cyan-50/40" },
  reviewer:            { avatar: avatarReviewer,     accent: "#10b981", ringClass: "ring-emerald-500", tag: "Quality Guardian",     bgTint: "bg-emerald-50/40" },
  qa_agent:            { avatar: avatarQa,          accent: "#ef4444", ringClass: "ring-rose-500",    tag: "Defect Hunter",        bgTint: "bg-rose-50/40" },
  release_coordinator: { avatar: avatarRelease,     accent: "#f97316", ringClass: "ring-orange-500",  tag: "Ship Captain",         bgTint: "bg-orange-50/40" },
};

export const DEFAULT_PERSONA: RolePersona = {
  avatar: avatarArchitect,
  accent: "#6b7280",
  ringClass: "ring-muted-foreground",
  tag: "Specialist",
  bgTint: "bg-secondary/20",
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

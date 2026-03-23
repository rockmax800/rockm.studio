import type { EntityState } from "@/types/workshop";

type StatusVariant = "neutral" | "blue" | "cyan" | "amber" | "green" | "red" | "muted";

const stateVariantMap: Record<string, StatusVariant> = {
  // Neutral
  draft: "neutral",
  created: "neutral",
  // Blue
  ready: "blue",
  scoped: "blue",
  assigned: "blue",
  classified: "blue",
  // Cyan
  active: "cyan",
  running: "cyan",
  in_progress: "cyan",
  preparing: "cyan",
  // Amber
  waiting_review: "amber",
  in_review: "amber",
  under_review: "amber",
  needs_clarification: "amber",
  pending: "amber",
  submitted: "amber",
  // Green
  approved: "green",
  approved_with_notes: "green",
  accepted: "green",
  done: "green",
  completed: "green",
  produced_output: "green",
  frozen: "green",
  // Red
  blocked: "red",
  rejected: "red",
  failed: "red",
  escalated: "red",
  timed_out: "red",
  // Muted
  paused: "muted",
  deferred: "muted",
  archived: "muted",
  cancelled: "muted",
  superseded: "muted",
  expired: "muted",
  finalized: "muted",
  closed: "muted",
};

export function getStatusVariant(state: string): StatusVariant {
  return stateVariantMap[state] || "neutral";
}

export function formatState(state: string): string {
  return state.replace(/_/g, " ");
}
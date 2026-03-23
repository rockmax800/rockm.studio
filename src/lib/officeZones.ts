// Office Zone mapping utility
// Maps task states to Office visualization zones.

const STATE_TO_ZONE: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  assigned: "Ready",
  in_progress: "In Progress",
  waiting_review: "Waiting Review",
  rework_required: "Rework",
  escalated: "Escalated",
  blocked: "Blocked",
  approved: "Approved",
  done: "Done",
  cancelled: "Done",
};

export function taskStateToZone(state: string): string {
  return STATE_TO_ZONE[state] ?? "Unknown";
}

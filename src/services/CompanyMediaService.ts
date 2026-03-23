// PART 2 — Significant Event Detection
// PART 6 — Content Controls (max 3 drafts/day, aggregate similar events)

import { supabase } from "@/integrations/supabase/client";

export interface SignificantEvent {
  event_type: string;
  event_reference_id: string;
  context: string;
}

const SIGNIFICANT_EVENT_TYPES = [
  "project.activated",
  "project.completed",
  "task.done",
  "employee.hired",
  "employee.replaced",
  "model.upgrade",
  "prompt.updated",
  "department.created",
  "release.completed",
];

/**
 * Detect significant events from recent activity_events and office_events.
 * Filters out low-level transitions.
 */
export async function detectSignificantEvents(
  sinceHours = 24
): Promise<SignificantEvent[]> {
  const since = new Date(Date.now() - sinceHours * 3600_000).toISOString();

  const [activityRes, officeRes] = await Promise.all([
    supabase
      .from("activity_events")
      .select("id, event_type, entity_type, entity_id, event_payload, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("office_events")
      .select("id, event_type, entity_type, entity_id, timestamp")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false })
      .limit(200),
  ]);

  const events: SignificantEvent[] = [];
  const seen = new Set<string>();

  for (const e of activityRes.data ?? []) {
    const mapped = mapActivityEvent(e);
    if (!mapped) continue;
    const dedup = `${mapped.event_type}::${mapped.event_reference_id}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);
    events.push(mapped);
  }

  for (const e of officeRes.data ?? []) {
    const mapped = mapOfficeEvent(e);
    if (!mapped) continue;
    const dedup = `${mapped.event_type}::${mapped.event_reference_id}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);
    events.push(mapped);
  }

  return events;
}

function mapActivityEvent(e: any): SignificantEvent | null {
  const t = e.event_type;
  if (t === "state_change" && e.entity_type === "project") {
    const payload = e.event_payload as any;
    if (payload?.to === "active") {
      return { event_type: "project.activated", event_reference_id: e.entity_id, context: `Project activated` };
    }
    if (payload?.to === "completed") {
      return { event_type: "project.completed", event_reference_id: e.entity_id, context: `Project completed` };
    }
  }
  if (t === "state_change" && e.entity_type === "task") {
    const payload = e.event_payload as any;
    if (payload?.to === "done") {
      return { event_type: "task.done", event_reference_id: e.entity_id, context: `Task milestone completed` };
    }
  }
  if (t === "employee_hired" || t === "hire") {
    return { event_type: "employee.hired", event_reference_id: e.entity_id, context: `New AI employee hired` };
  }
  if (t === "employee_replaced" || t === "replacement_executed") {
    return { event_type: "employee.replaced", event_reference_id: e.entity_id, context: `AI employee replaced with upgraded model` };
  }
  if (t === "prompt_version_created" || t === "prompt_updated") {
    return { event_type: "prompt.updated", event_reference_id: e.entity_id, context: `Prompt version updated` };
  }
  if (t === "team_created" || t === "department_created") {
    return { event_type: "department.created", event_reference_id: e.entity_id, context: `New department created` };
  }
  return null;
}

function mapOfficeEvent(e: any): SignificantEvent | null {
  if (e.event_type === "adaptive_route") {
    return { event_type: "model.upgrade", event_reference_id: e.entity_id, context: `Model routing upgraded via adaptive routing` };
  }
  return null;
}

/**
 * Check how many drafts were created today.
 * PART 6 — max 3 per day.
 */
export async function getDraftCountToday(): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("blog_posts" as any)
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString());

  return count ?? 0;
}

/**
 * Check if a similar event already has a blog post draft today.
 * PART 6 — aggregate similar events.
 */
export async function hasDraftForEventType(eventType: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("blog_posts" as any)
    .select("id", { count: "exact", head: true })
    .eq("event_type", eventType)
    .gte("created_at", todayStart.toISOString());

  return (count ?? 0) > 0;
}

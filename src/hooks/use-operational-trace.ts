import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TraceItem {
  id: string;
  timestamp: string;
  source_table: string;
  entity_type: string;
  entity_id: string;
  project_id: string | null;
  event_type: string;
  actor_type: string | null;
  actor_ref: string | null;
  summary: string;
  raw: Record<string, unknown>;
}

export interface TraceFilters {
  projectId?: string;
  entityType?: string;
  eventType?: string;
  since?: string;
  until?: string;
}

async function fetchOperationalTrace(filters: TraceFilters): Promise<TraceItem[]> {
  const items: TraceItem[] = [];

  // 1. activity_events — primary UI event source
  let aeQ = supabase
    .from("activity_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filters.projectId) aeQ = aeQ.eq("project_id", filters.projectId);
  if (filters.entityType) aeQ = aeQ.eq("entity_type", filters.entityType);
  if (filters.eventType) aeQ = aeQ.eq("event_type", filters.eventType);
  if (filters.since) aeQ = aeQ.gte("created_at", filters.since);
  if (filters.until) aeQ = aeQ.lte("created_at", filters.until);
  const { data: aeData } = await aeQ;
  for (const e of aeData ?? []) {
    items.push({
      id: `ae-${e.id}`,
      timestamp: e.created_at,
      source_table: "activity_events",
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      project_id: e.project_id,
      event_type: e.event_type,
      actor_type: e.actor_type,
      actor_ref: e.actor_role_id,
      summary: `${e.event_type} on ${e.entity_type}`,
      raw: e as any,
    });
  }

  // 2. office_events — office layer events
  if (!filters.entityType || filters.entityType === "office") {
    let oeQ = supabase
      .from("office_events")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(100);
    if (filters.projectId) oeQ = oeQ.eq("project_id", filters.projectId);
    if (filters.eventType) oeQ = oeQ.eq("event_type", filters.eventType);
    if (filters.since) oeQ = oeQ.gte("timestamp", filters.since);
    if (filters.until) oeQ = oeQ.lte("timestamp", filters.until);
    const { data: oeData } = await oeQ;
    for (const e of oeData ?? []) {
      items.push({
        id: `oe-${e.id}`,
        timestamp: e.timestamp,
        source_table: "office_events",
        entity_type: e.entity_type,
        entity_id: e.entity_id,
        project_id: e.project_id,
        event_type: e.event_type,
        actor_type: "system",
        actor_ref: e.actor_role_id,
        summary: `${e.event_type} → ${e.entity_type}${e.to_zone ? ` (zone: ${e.to_zone})` : ""}`,
        raw: e as any,
      });
    }
  }

  // 3. approvals — state changes
  if (!filters.entityType || filters.entityType === "approval") {
    let apQ = supabase
      .from("approvals")
      .select("id, project_id, state, decision, summary, target_type, target_id, created_at, decided_at, requested_by_role_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (filters.projectId) apQ = apQ.eq("project_id", filters.projectId);
    if (filters.since) apQ = apQ.gte("created_at", filters.since);
    if (filters.until) apQ = apQ.lte("created_at", filters.until);
    const { data: apData } = await apQ;
    for (const a of apData ?? []) {
      items.push({
        id: `ap-${a.id}`,
        timestamp: a.decided_at ?? a.created_at,
        source_table: "approvals",
        entity_type: "approval",
        entity_id: a.id,
        project_id: a.project_id,
        event_type: a.decision ? `decision:${a.decision}` : `state:${a.state}`,
        actor_type: "founder",
        actor_ref: a.requested_by_role_id,
        summary: `${a.summary?.slice(0, 80) ?? "Approval"} [${a.state}${a.decision ? `/${a.decision}` : ""}]`,
        raw: a as any,
      });
    }
  }

  // 4. runs — execution trace
  if (!filters.entityType || filters.entityType === "run") {
    let rQ = supabase
      .from("runs")
      .select("id, task_id, project_id, state, run_number, error_class, started_at, updated_at, agent_role_id")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (filters.projectId) rQ = rQ.eq("project_id", filters.projectId);
    if (filters.since) rQ = rQ.gte("updated_at", filters.since);
    if (filters.until) rQ = rQ.lte("updated_at", filters.until);
    const { data: rData } = await rQ;
    for (const r of rData ?? []) {
      items.push({
        id: `run-${r.id}`,
        timestamp: r.updated_at ?? r.started_at,
        source_table: "runs",
        entity_type: "run",
        entity_id: r.id,
        project_id: r.project_id,
        event_type: `state:${r.state}`,
        actor_type: "agent",
        actor_ref: r.agent_role_id,
        summary: `Run #${r.run_number} → ${r.state}${r.error_class ? ` (${r.error_class})` : ""}`,
        raw: r as any,
      });
    }
  }

  // 5. reviews — review lifecycle
  if (!filters.entityType || filters.entityType === "review") {
    let rvQ = supabase
      .from("reviews")
      .select("id, project_id, task_id, lifecycle_state, verdict, reviewer_role_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (filters.projectId) rvQ = rvQ.eq("project_id", filters.projectId);
    if (filters.since) rvQ = rvQ.gte("updated_at", filters.since);
    if (filters.until) rvQ = rvQ.lte("updated_at", filters.until);
    const { data: rvData } = await rvQ;
    for (const rv of rvData ?? []) {
      items.push({
        id: `rv-${rv.id}`,
        timestamp: rv.updated_at ?? rv.created_at,
        source_table: "reviews",
        entity_type: "review",
        entity_id: rv.id,
        project_id: rv.project_id,
        event_type: `${rv.lifecycle_state}${rv.verdict ? `/${rv.verdict}` : ""}`,
        actor_type: "agent",
        actor_ref: rv.reviewer_role_id,
        summary: `Review ${rv.lifecycle_state}${rv.verdict ? ` → ${rv.verdict}` : ""}`,
        raw: rv as any,
      });
    }
  }

  // Sort all items by timestamp desc
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items;
}

export function useOperationalTrace(filters: TraceFilters) {
  return useQuery({
    queryKey: ["operational_trace", filters],
    queryFn: () => fetchOperationalTrace(filters),
    refetchInterval: 30_000,
  });
}

export async function fetchProjectsForFilter() {
  const { data } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");
  return data ?? [];
}

export function useProjectsForFilter() {
  return useQuery({
    queryKey: ["projects_filter_list"],
    queryFn: fetchProjectsForFilter,
    staleTime: 60_000,
  });
}

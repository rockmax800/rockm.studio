import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Project = Tables<"projects">;
export type AgentRole = Tables<"agent_roles">;
export type Task = Tables<"tasks">;
export type Run = Tables<"runs">;
export type Artifact = Tables<"artifacts">;
export type Review = Tables<"reviews">;
export type Approval = Tables<"approvals">;
export type ActivityEvent = Tables<"activity_events">;
export type Document = Tables<"documents">;
export type ContextPack = Tables<"context_packs">;

// Queries
export async function fetchProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTasks(projectId?: string) {
  let q = supabase.from("tasks").select("*, agent_roles(name)").order("updated_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchDocuments(projectId?: string) {
  let q = supabase.from("documents").select("*").order("updated_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchApprovals(projectId?: string) {
  let q = supabase.from("approvals").select("*").order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchActivityEvents(projectId?: string, limit = 20) {
  let q = supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(limit);
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchAgentRoles() {
  const { data, error } = await supabase.from("agent_roles").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function fetchRuns(taskId?: string) {
  let q = supabase.from("runs").select("*, agent_roles(name)").order("created_at", { ascending: false });
  if (taskId) q = q.eq("task_id", taskId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchArtifacts(projectId?: string) {
  let q = supabase.from("artifacts").select("*").order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchReviews(projectId?: string) {
  let q = supabase.from("reviews").select("*, agent_roles(name)").order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// Dashboard aggregates
export async function fetchDashboardCounts() {
  const [blocked, pendingApprovals, waitingReview, failedRuns] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("state", "blocked"),
    supabase.from("approvals").select("id", { count: "exact", head: true }).eq("state", "pending"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("state", "waiting_review"),
    supabase.from("runs").select("id", { count: "exact", head: true }).eq("state", "failed"),
  ]);
  return {
    blockedTasks: blocked.count ?? 0,
    pendingApprovals: pendingApprovals.count ?? 0,
    waitingReview: waitingReview.count ?? 0,
    failedRuns: failedRuns.count ?? 0,
  };
}

// ── Operational Diagnostics Queries ──

export async function fetchWorkerNodes() {
  const { data, error } = await supabase
    .from("worker_nodes")
    .select("*")
    .order("last_heartbeat_at", { ascending: false });
  if (error) throw error;

  const now = Date.now();
  const THRESHOLD = 30 * 1000;

  return (data ?? []).map((w) => {
    const age = now - new Date(w.last_heartbeat_at).getTime();
    const derivedStatus = age > THRESHOLD * 4 ? "offline"
      : age > THRESHOLD ? "degraded"
      : "online";
    return { ...w, derived_status: derivedStatus, heartbeat_age_ms: age };
  });
}

export async function fetchStalledEntities() {
  const now = Date.now();
  const TEN_MIN = new Date(now - 10 * 60 * 1000).toISOString();

  const [stalledRuns, stuckDeploys] = await Promise.all([
    supabase.from("runs")
      .select("id, task_id, project_id, state, run_number, lease_owner, lease_expires_at, heartbeat_at, error_class, started_at, updated_at")
      .in("state", ["preparing", "running"])
      .lt("updated_at", TEN_MIN)
      .order("updated_at", { ascending: true })
      .limit(50),
    supabase.from("deployments")
      .select("id, project_id, environment, version_label, status, started_at")
      .eq("status", "deploying")
      .lt("started_at", new Date(now - 15 * 60 * 1000).toISOString())
      .order("started_at", { ascending: true })
      .limit(20),
  ]);

  return {
    stalled_runs: stalledRuns.data ?? [],
    stuck_deploys: stuckDeploys.data ?? [],
    total_issues: (stalledRuns.data?.length ?? 0) + (stuckDeploys.data?.length ?? 0),
  };
}

export async function fetchResourceMetrics() {
  const [workersRes, activeRunsRes, pendingOutboxRes] = await Promise.all([
    supabase.from("worker_nodes").select("hostname, cpu_usage_pct, memory_usage_pct, docker_container_count, disk_usage_pct, status"),
    supabase.from("runs").select("id", { count: "exact", head: true }).in("state", ["preparing", "running"]),
    supabase.from("outbox_events").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const workers = workersRes.data ?? [];
  const avgCpu = workers.length > 0
    ? workers.reduce((s, w) => s + (Number(w.cpu_usage_pct) || 0), 0) / workers.length
    : null;
  const avgMem = workers.length > 0
    ? workers.reduce((s, w) => s + (Number(w.memory_usage_pct) || 0), 0) / workers.length
    : null;

  const warnings: string[] = [];
  if (avgCpu !== null && avgCpu > 80) warnings.push("High CPU usage");
  if (avgMem !== null && avgMem > 85) warnings.push("High memory usage");

  return {
    worker_count: workers.length,
    avg_cpu_pct: avgCpu ? Math.round(avgCpu * 10) / 10 : null,
    avg_memory_pct: avgMem ? Math.round(avgMem * 10) / 10 : null,
    active_runs: activeRunsRes.count ?? 0,
    pending_outbox: pendingOutboxRes.count ?? 0,
    warnings,
    pressure_level: warnings.length === 0 ? "normal" : warnings.length <= 2 ? "elevated" : "critical",
  };
}

// Mutations
export async function createProject(data: { name: string; slug: string; purpose: string; project_type?: string; founder_notes?: string }) {
  const { data: project, error } = await supabase.from("projects").insert(data).select().single();
  if (error) throw error;
  return project;
}

export async function createTask(data: {
  project_id: string;
  title: string;
  purpose: string;
  domain: string;
  expected_output_type: string;
  priority?: string;
  urgency?: string;
  acceptance_criteria?: unknown[];
  owner_role_id?: string;
}) {
  const { data: task, error } = await supabase.from("tasks").insert({
    ...data,
    acceptance_criteria: data.acceptance_criteria ?? [],
  } as any).select().single();
  if (error) throw error;
  return task;
}

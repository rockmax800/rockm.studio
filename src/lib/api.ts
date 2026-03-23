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
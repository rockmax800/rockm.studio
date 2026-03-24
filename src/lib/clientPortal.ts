import { supabase } from "@/integrations/supabase/client";

/**
 * Client Portal — Read-only data fetching layer.
 * Security: access via hashed token, no internal data exposure.
 */

// Simple hash for token lookup (SHA-256 via Web Crypto)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Safe activity event types visible to clients
const CLIENT_SAFE_EVENTS = [
  "project.activated",
  "milestone.completed",
  "deployment.live",
  "task.done",
  "release.completed",
];

export interface ClientPortalData {
  project: {
    name: string;
    state: string;
    current_phase: string | null;
  };
  tasks: Array<{ title: string; state: string }>;
  deployments: Array<{
    environment: string;
    status: string;
    preview_url: string | null;
    version_label: string | null;
  }>;
  releaseNotes: Array<{ title: string; summary: string | null; created_at: string }>;
  timeline: Array<{ event_type: string; created_at: string }>;
  deliveryProgress: number;
  client: { name: string };
  stagingUrl: string | null;
  productionUrl: string | null;
}

export async function resolveClientAccess(accessToken: string) {
  const tokenHash = await hashToken(accessToken);

  const { data: access, error } = await supabase
    .from("client_project_access")
    .select("*, clients(*)")
    .eq("access_token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !access) return null;
  return access;
}

export async function fetchClientPortalData(
  projectId: string,
  clientName: string
): Promise<ClientPortalData> {
  // Fetch project (safe fields only)
  const { data: project } = await supabase
    .from("projects")
    .select("name, state, current_phase")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("Project not found");

  // Fetch tasks (title + state only)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, state")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  // Fetch deployments (safe fields only)
  const { data: deployments } = await supabase
    .from("deployments")
    .select("environment, status, preview_url, version_label")
    .eq("project_id", projectId)
    .order("started_at", { ascending: false });

  // Fetch release notes (from artifacts with type release_note or similar)
  const { data: releaseNotes } = await supabase
    .from("artifacts")
    .select("title, summary, created_at")
    .eq("project_id", projectId)
    .eq("artifact_type", "release")
    .eq("state", "accepted")
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch safe timeline events
  const { data: timeline } = await supabase
    .from("activity_events")
    .select("event_type, created_at")
    .eq("project_id", projectId)
    .in("event_type", CLIENT_SAFE_EVENTS)
    .order("created_at", { ascending: false })
    .limit(20);

  // Calculate delivery progress
  const allTasks = tasks ?? [];
  const doneTasks = allTasks.filter((t) => t.state === "done").length;
  const deliveryProgress = allTasks.length > 0
    ? Math.round((doneTasks / allTasks.length) * 100)
    : 0;

  // Extract preview URLs
  const deploys = deployments ?? [];
  const stagingDeploy = deploys.find(
    (d) => d.environment === "staging" && d.status === "live"
  );
  const productionDeploy = deploys.find(
    (d) => d.environment === "production" && d.status === "live"
  );

  return {
    project: {
      name: project.name,
      state: project.state,
      current_phase: project.current_phase,
    },
    tasks: allTasks.map((t) => ({ title: t.title, state: t.state })),
    deployments: deploys,
    releaseNotes: (releaseNotes ?? []).map((r) => ({
      title: r.title,
      summary: r.summary,
      created_at: r.created_at,
    })),
    timeline: (timeline ?? []).map((e) => ({
      event_type: e.event_type,
      created_at: e.created_at,
    })),
    deliveryProgress,
    client: { name: clientName },
    stagingUrl: stagingDeploy?.preview_url ?? null,
    productionUrl: productionDeploy?.preview_url ?? null,
  };
}

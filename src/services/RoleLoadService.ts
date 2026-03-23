// PART 2 — Role Load Metrics Service
// Read-only analytics: computes load metrics per agent role.

import { supabase } from "@/integrations/supabase/client";

export interface RoleLoadMetrics {
  role_id: string;
  role_name: string;
  role_code: string;
  team_id: string | null;
  active_tasks_count: number;
  avg_run_duration_ms: number;
  success_rate: number;
  performance_score: number;
  max_parallel_tasks: number;
  capacity_score: number;
  predicted_overload: boolean;
  allowed_domains: string[] | null;
}

let cachedMetrics: { data: RoleLoadMetrics[]; ts: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

export async function getRoleLoadMetrics(forceRefresh = false): Promise<RoleLoadMetrics[]> {
  if (!forceRefresh && cachedMetrics && Date.now() - cachedMetrics.ts < CACHE_TTL_MS) {
    return cachedMetrics.data;
  }

  const [rolesRes, tasksRes, runsRes] = await Promise.all([
    supabase.from("agent_roles").select("id, name, code, success_rate, performance_score, status, total_runs, allowed_domains, team_id, capacity_score, max_parallel_tasks").eq("status", "active"),
    supabase.from("tasks").select("id, owner_role_id, state").in("state", ["in_progress", "assigned", "waiting_review", "ready"]),
    supabase.from("runs").select("agent_role_id, duration_ms, state").in("state", ["finalized", "produced_output"]).not("duration_ms", "is", null).order("ended_at", { ascending: false }).limit(300),
  ]);

  const roles = rolesRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const runs = runsRes.data ?? [];

  // Active tasks per role
  const activeByRole: Record<string, number> = {};
  for (const t of tasks) {
    if (t.owner_role_id) {
      activeByRole[t.owner_role_id] = (activeByRole[t.owner_role_id] ?? 0) + 1;
    }
  }

  // Avg run duration per role (last 20)
  const durationsByRole: Record<string, number[]> = {};
  for (const r of runs) {
    if (!durationsByRole[r.agent_role_id]) durationsByRole[r.agent_role_id] = [];
    if (durationsByRole[r.agent_role_id].length < 20) {
      durationsByRole[r.agent_role_id].push(r.duration_ms);
    }
  }

  const metrics: RoleLoadMetrics[] = roles.map((role: any) => {
    const activeTasks = activeByRole[role.id] ?? 0;
    const durations = durationsByRole[role.id] ?? [];
    const avgDuration = durations.length > 0
      ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
      : 0;
    const maxParallel = role.max_parallel_tasks ?? 2;

    return {
      role_id: role.id,
      role_name: role.name,
      role_code: role.code,
      team_id: role.team_id ?? null,
      active_tasks_count: activeTasks,
      avg_run_duration_ms: Math.round(avgDuration),
      success_rate: role.success_rate ?? 0,
      performance_score: role.performance_score ?? 0,
      max_parallel_tasks: maxParallel,
      capacity_score: role.capacity_score ?? 1,
      predicted_overload: activeTasks >= maxParallel,
      allowed_domains: role.allowed_domains as string[] | null,
    };
  });

  cachedMetrics = { data: metrics, ts: Date.now() };
  return metrics;
}

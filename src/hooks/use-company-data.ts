// PART 8 — Company dashboard data hook
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useCompanyDashboard() {
  return useQuery({
    queryKey: ["company-dashboard"],
    queryFn: async () => {
      const [teamsRes, rolesRes, tasksRes, runsRes, settingsRes] = await Promise.all([
        supabase.from("teams").select("*"),
        supabase.from("agent_roles").select("id, name, code, success_rate, performance_score, status, team_id, max_parallel_tasks, capacity_score, total_runs").eq("status", "active"),
        supabase.from("tasks").select("id, owner_role_id, state, domain, project_id").in("state", ["in_progress", "assigned", "waiting_review", "ready"]),
        supabase.from("runs").select("agent_role_id, duration_ms, state").in("state", ["finalized", "produced_output"]).not("duration_ms", "is", null).order("ended_at", { ascending: false }).limit(300),
        supabase.from("company_mode_settings").select("*").limit(1),
      ]);

      const teams = teamsRes.data ?? [];
      const roles = rolesRes.data ?? [];
      const tasks = tasksRes.data ?? [];
      const settings = (settingsRes.data ?? [])[0] ?? { enable_multi_team: false, max_parallel_projects: 3, cross_team_allowed: false };

      // Active tasks per role
      const activeByRole: Record<string, number> = {};
      for (const t of tasks) {
        if (t.owner_role_id) activeByRole[t.owner_role_id] = (activeByRole[t.owner_role_id] ?? 0) + 1;
      }

      // Avg duration per role
      const durByRole: Record<string, number[]> = {};
      for (const r of (runsRes.data ?? [])) {
        if (!durByRole[r.agent_role_id]) durByRole[r.agent_role_id] = [];
        if (durByRole[r.agent_role_id].length < 20) durByRole[r.agent_role_id].push(r.duration_ms);
      }

      const rolesWithMetrics = roles.map((r: any) => {
        const durations = durByRole[r.id] ?? [];
        const avgDuration = durations.length > 0 ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : 0;
        const activeTasks = activeByRole[r.id] ?? 0;
        return {
          ...r,
          active_tasks_count: activeTasks,
          avg_run_duration_ms: Math.round(avgDuration),
          predicted_overload: activeTasks >= (r.max_parallel_tasks ?? 2),
        };
      });

      const rolesPerTeam: Record<string, typeof rolesWithMetrics> = {};
      for (const r of rolesWithMetrics) {
        const teamId = r.team_id ?? "unassigned";
        if (!rolesPerTeam[teamId]) rolesPerTeam[teamId] = [];
        rolesPerTeam[teamId].push(r);
      }

      // Cross-team assignments: tasks where role's team differs from project's team
      const crossTeamCount = 0; // Would need project.team_id join — placeholder for now

      const overloadedRoles = rolesWithMetrics.filter((r: any) => r.predicted_overload);

      return {
        teams,
        roles_per_team: rolesPerTeam,
        load_metrics: rolesWithMetrics,
        overloaded_roles: overloadedRoles,
        cross_team_assignments: crossTeamCount,
        settings,
      };
    },
  });
}

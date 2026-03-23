import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export interface OfficeEvent {
  id: string;
  project_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  from_zone: string | null;
  to_zone: string | null;
  actor_role_id: string | null;
  timestamp: string;
}

export interface AgentRoleInfo {
  id: string;
  name: string;
  code: string;
  success_rate: number;
  performance_score: number;
  team_id: string | null;
  max_parallel_tasks: number;
  capacity_score: number;
}

export interface TeamInfo {
  id: string;
  name: string;
  focus_domain: string;
}

export interface BottleneckPrediction {
  id: string;
  task_id: string;
  prediction_type: string;
  confidence_score: number;
  explanation: string | null;
  role_id: string | null;
  resolved: boolean;
  created_at: string;
}

export function useOfficeData() {
  return useQuery({
    queryKey: ["office"],
    queryFn: async () => {
      const [projectsRes, tasksRes, runsRes, reviewsRes, approvalsRes, eventsRes, officeEventsRes, autonomyRes, blogRes, rolesRes, inboxApprovalsRes, predictionsRes, teamsRes, companyRes, employeesRes, experimentsRes, benchmarksRes, marketModelsRes, systemModeRes] = await Promise.all([
        supabase.from("projects").select("*").neq("state", "archived").order("name"),
        supabase.from("tasks").select("id, title, state, project_id, owner_role_id, domain, priority").neq("state", "cancelled"),
        supabase.from("runs").select("id, task_id, state, run_number, agent_role_id").order("run_number", { ascending: false }),
        supabase.from("reviews").select("id, task_id, state, reviewer_role_id").in("state", ["created", "in_progress", "needs_clarification"]),
        supabase.from("approvals").select("id, target_id, target_type, state").eq("state", "pending"),
        supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("office_events").select("*").order("timestamp", { ascending: false }).limit(200),
        supabase.from("autonomy_settings").select("*").limit(10),
        supabase.from("blog_posts" as any).select("id, status").order("created_at", { ascending: false }).limit(10),
        supabase.from("agent_roles").select("id, name, code, success_rate, performance_score, status, team_id, max_parallel_tasks, capacity_score").eq("status", "active"),
        supabase.from("approvals").select("id").eq("state", "pending"),
        supabase.from("bottleneck_predictions").select("*").eq("resolved", false).order("created_at", { ascending: false }),
        supabase.from("teams").select("*"),
        supabase.from("company_mode_settings").select("*").limit(1),
        supabase.from("ai_employees").select("id, name, role_id, role_code, reputation_score, status, hired_at, model_name, team_id, provider"),
        supabase.from("prompt_experiments").select("role_id, status").eq("status", "active"),
        supabase.from("model_benchmarks" as any).select("model_market_id, team_id, avg_success_rate"),
        supabase.from("model_market" as any).select("id, model_name"),
        supabase.from("system_settings" as any).select("mode, experimental_features").limit(1).single(),
      ]);

      const tasks = tasksRes.data ?? [];
      const runs = runsRes.data ?? [];
      const reviews = reviewsRes.data ?? [];
      const approvals = approvalsRes.data ?? [];
      const roles = (rolesRes.data ?? []) as AgentRoleInfo[];
      const rolesById = Object.fromEntries(roles.map(r => [r.id, r]));
      const predictions = (predictionsRes.data ?? []) as BottleneckPrediction[];
      const teams = (teamsRes.data ?? []) as TeamInfo[];
      const teamsById = Object.fromEntries(teams.map(t => [t.id, t]));
      const employees = employeesRes.data ?? [];
      const employeesByRoleId = Object.fromEntries(employees.map((e: any) => [e.role_id, e]));
      const companySettings = (companyRes.data ?? [])[0] ?? null;

      // Experiment lookup by role_id
      const experiments = experimentsRes.data ?? [];
      const experimentRoleIds = new Set(experiments.map((e: any) => e.role_id));

      // Top performer lookup: best model per team from benchmarks
      const benchmarksData = (benchmarksRes.data ?? []) as any[];
      const marketModelsData = (marketModelsRes.data ?? []) as any[];
      const marketModelsById = Object.fromEntries(marketModelsData.map((m: any) => [m.id, m]));
      const topModelPerTeam: Record<string, string> = {};
      for (const team of teams) {
        const teamBenchmarks = benchmarksData.filter((b: any) => b.team_id === team.id);
        if (teamBenchmarks.length > 0) {
          const best = teamBenchmarks.reduce((a: any, b: any) => a.avg_success_rate > b.avg_success_rate ? a : b);
          const mm = marketModelsById[best.model_market_id];
          if (mm) topModelPerTeam[team.id] = mm.model_name;
        }
      }

      // Index predictions by task_id
      const predictionsByTask: Record<string, BottleneckPrediction[]> = {};
      const roleOverloads: BottleneckPrediction[] = [];
      for (const p of predictions) {
        if (p.prediction_type === "role_overload") {
          roleOverloads.push(p);
        } else {
          if (!predictionsByTask[p.task_id]) predictionsByTask[p.task_id] = [];
          predictionsByTask[p.task_id].push(p);
        }
      }

      const taskCards = tasks.map((t: any) => {
        const taskRuns = runs.filter((r: any) => r.task_id === t.id);
        const latestRun = taskRuns[0] ?? null;
        const role = t.owner_role_id ? rolesById[t.owner_role_id] : null;
        const employee = t.owner_role_id ? employeesByRoleId[t.owner_role_id] : null;
        const taskPredictions = predictionsByTask[t.id] ?? [];
        return {
          id: t.id,
          title: t.title,
          state: t.state,
          project_id: t.project_id,
          owner_role_id: t.owner_role_id,
          domain: t.domain,
          priority: t.priority,
          latest_run_state: latestRun?.state ?? null,
          has_pending_review: reviews.some((r: any) => r.task_id === t.id),
          has_pending_approval: approvals.some((a: any) => a.target_id === t.id && a.target_type === "task"),
          role_code: role?.code ?? null,
          role_name: role?.name ?? null,
          role_success_rate: role?.success_rate ?? null,
          role_performance_score: role?.performance_score ?? null,
          role_team_id: role?.team_id ?? null,
          employee_name: employee?.name ?? null,
          employee_reputation: employee?.reputation_score ?? null,
          employee_status: employee?.status ?? null,
          is_new_hire: employee ? (new Date(employee.hired_at).getTime() > Date.now() - 3600000) : false,
          is_experiment: role ? experimentRoleIds.has(role.id) : false,
          is_top_performer: (employee && employee.team_id && employee.model_name)
            ? topModelPerTeam[employee.team_id] === employee.model_name
            : false,
          has_prediction: taskPredictions.length > 0,
          prediction_type: taskPredictions[0]?.prediction_type ?? null,
        };
      });

      const projects = (projectsRes.data ?? []).map((p: any) => ({
        ...p,
        tasks: taskCards.filter((t: any) => t.project_id === p.id),
      }));

      const autonomySettings = autonomyRes.data ?? [];
      const blogPosts = (blogRes.data ?? []) as any[];
      const hasDraftBlog = blogPosts.some((p: any) => p.status === "draft");
      const hasApprovedBlog = blogPosts.some((p: any) => p.status === "approved");
      const isLeanMode = autonomySettings.length === 0 || autonomySettings.some((s: any) => s.auto_execute_implementation === false);

      // Compute team load indicators
      const teamLoadMap: Record<string, { active: number; max: number }> = {};
      for (const role of roles) {
        if (!role.team_id) continue;
        if (!teamLoadMap[role.team_id]) teamLoadMap[role.team_id] = { active: 0, max: 0 };
        const activeTasks = taskCards.filter(t => t.owner_role_id === role.id && !["done", "cancelled"].includes(t.state)).length;
        teamLoadMap[role.team_id].active += activeTasks;
        teamLoadMap[role.team_id].max += role.max_parallel_tasks;
      }

      const teamsWithLoad = teams.map(t => {
        const load = teamLoadMap[t.id] ?? { active: 0, max: 1 };
        const ratio = load.max > 0 ? load.active / load.max : 0;
        return {
          ...t,
          active_tasks: load.active,
          max_capacity: load.max,
          load_ratio: ratio,
          load_status: ratio >= 0.8 ? "overloaded" as const : ratio >= 0.5 ? "high" as const : "balanced" as const,
          roles: roles.filter(r => r.team_id === t.id),
        };
      });

      const systemMode = (systemModeRes.data as any)?.mode ?? "production";
      const experimentalFeatures = (systemModeRes.data as any)?.experimental_features ?? {};

      return {
        projects,
        allTasks: taskCards,
        recentEvents: eventsRes.data ?? [],
        officeEvents: (officeEventsRes.data ?? []) as OfficeEvent[],
        leanMode: isLeanMode,
        roles,
        teams: teamsWithLoad,
        teamsById,
        pendingInboxCount: (inboxApprovalsRes.data ?? []).length,
        projectsInReview: projects.filter((p: any) => p.state === "in_review"),
        predictions,
        roleOverloads,
        companySettings,
        hasDraftBlog,
        hasApprovedBlog,
        systemMode: systemMode as "production" | "experimental",
        experimentalFeatures,
      };
    },
  });
}

// Real-time subscription hook
export function useOfficeRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("office-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "office_events" },
        () => { qc.invalidateQueries({ queryKey: ["office"] }); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bottleneck_predictions" },
        () => { qc.invalidateQueries({ queryKey: ["office"] }); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

export function useRefreshOffice() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["office"] });
}

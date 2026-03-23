// Control Plane data fetching hooks — uses Supabase client directly

import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["control", "overview"],
    queryFn: async () => {
      const [projectsRes, tasksRes, approvalsRes, runsRes] = await Promise.all([
        supabase.from("projects").select("*").neq("state", "archived").order("updated_at", { ascending: false }),
        supabase.from("tasks").select("id, project_id, state").order("updated_at", { ascending: false }),
        supabase.from("approvals").select("*").eq("state", "pending").order("created_at", { ascending: false }),
        supabase.from("runs").select("*").eq("state", "failed").order("updated_at", { ascending: false }).limit(10),
      ]);

      const projects = projectsRes.data ?? [];
      const tasks = tasksRes.data ?? [];
      const pendingApprovals = approvalsRes.data ?? [];
      const failedRuns = runsRes.data ?? [];

      const escalatedRes = await supabase.from("tasks").select("*").eq("state", "escalated").order("updated_at", { ascending: false }).limit(10);
      const escalatedTasks = escalatedRes.data ?? [];

      const projectSummaries = projects.map((p) => {
        const pt = tasks.filter((t) => t.project_id === p.id);
        return {
          ...p,
          activeTasksCount: pt.filter((t) => !["done", "cancelled"].includes(t.state)).length,
          blockedTasksCount: pt.filter((t) => t.state === "blocked").length,
          pendingApprovalsCount: pendingApprovals.filter((a) => a.project_id === p.id).length,
        };
      });

      return { projects: projectSummaries, pendingApprovals, recentlyFailedRuns: failedRuns, escalatedTasks };
    },
  });
}

export function useProjectDetail(id: string) {
  return useQuery({
    queryKey: ["control", "project", id],
    queryFn: async () => {
      const [projectRes, tasksRes, artifactsRes, reviewsRes, approvalsRes, activityRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("tasks").select("*").eq("project_id", id).order("updated_at", { ascending: false }),
        supabase.from("artifacts").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase.from("approvals").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase.from("activity_events").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (projectRes.error) throw projectRes.error;
      return {
        project: projectRes.data,
        tasks: tasksRes.data ?? [],
        artifacts: artifactsRes.data ?? [],
        reviews: reviewsRes.data ?? [],
        approvals: approvalsRes.data ?? [],
        activityFeed: activityRes.data ?? [],
      };
    },
    enabled: !!id,
  });
}

export function useTaskDetail(id: string) {
  return useQuery({
    queryKey: ["control", "task", id],
    queryFn: async () => {
      const [taskRes, runsRes, artifactsRes, reviewsRes, approvalsRes, contextRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("id", id).single(),
        supabase.from("runs").select("*").eq("task_id", id).order("run_number", { ascending: false }),
        supabase.from("artifacts").select("*").eq("task_id", id).order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("task_id", id).order("created_at", { ascending: false }),
        supabase.from("approvals").select("*").eq("target_id", id).eq("target_type", "task").order("created_at", { ascending: false }),
        supabase.from("context_packs").select("*").eq("task_id", id).order("created_at", { ascending: false }).limit(1),
      ]);
      if (taskRes.error) throw taskRes.error;
      return {
        task: taskRes.data,
        runs: runsRes.data ?? [],
        artifacts: artifactsRes.data ?? [],
        reviews: reviewsRes.data ?? [],
        approvals: approvalsRes.data ?? [],
        contextPack: contextRes.data?.[0] ?? null,
      };
    },
    enabled: !!id,
  });
}

export function useApprovalDetail(id: string) {
  return useQuery({
    queryKey: ["control", "approval", id],
    queryFn: async () => {
      const approvalRes = await supabase.from("approvals").select("*").eq("id", id).single();
      if (approvalRes.error) throw approvalRes.error;
      const approval = approvalRes.data;

      const [artifactsRes, reviewsRes] = await Promise.all([
        supabase.from("artifacts").select("*").eq("project_id", approval.project_id).order("created_at", { ascending: false }).limit(10),
        supabase.from("reviews").select("*").eq("project_id", approval.project_id).order("created_at", { ascending: false }).limit(10),
      ]);

      return { approval, relatedArtifacts: artifactsRes.data ?? [], relatedReviews: reviewsRes.data ?? [] };
    },
    enabled: !!id,
  });
}

export function useRunDetail(id: string) {
  return useQuery({
    queryKey: ["control", "run", id],
    queryFn: async () => {
      const runRes = await supabase.from("runs").select("*").eq("id", id).single();
      if (runRes.error) throw runRes.error;
      const run = runRes.data;

      const [taskRes, artifactsRes, activityRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("id", run.task_id).single(),
        supabase.from("artifacts").select("*").eq("run_id", id).order("created_at", { ascending: false }),
        supabase.from("activity_events").select("*").eq("entity_id", id).eq("entity_type", "run").order("created_at", { ascending: false }).limit(20),
      ]);

      return {
        run,
        task: taskRes.data,
        artifacts: artifactsRes.data ?? [],
        activityFeed: activityRes.data ?? [],
      };
    },
    enabled: !!id,
  });
}

export function useInvalidateControl() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["control"] });
}

import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

export function useOfficeData() {
  return useQuery({
    queryKey: ["office"],
    queryFn: async () => {
      const [projectsRes, tasksRes, runsRes, reviewsRes, approvalsRes, eventsRes, officeEventsRes] = await Promise.all([
        supabase.from("projects").select("*").neq("state", "archived").order("name"),
        supabase.from("tasks").select("id, title, state, project_id, owner_role_id, domain, priority").neq("state", "cancelled"),
        supabase.from("runs").select("id, task_id, state, run_number").order("run_number", { ascending: false }),
        supabase.from("reviews").select("id, task_id, state").in("state", ["created", "in_progress", "needs_clarification"]),
        supabase.from("approvals").select("id, target_id, target_type, state").eq("state", "pending"),
        supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("office_events").select("*").order("timestamp", { ascending: false }).limit(200),
      ]);

      const tasks = tasksRes.data ?? [];
      const runs = runsRes.data ?? [];
      const reviews = reviewsRes.data ?? [];
      const approvals = approvalsRes.data ?? [];

      const taskCards = tasks.map((t: any) => {
        const taskRuns = runs.filter((r: any) => r.task_id === t.id);
        const latestRun = taskRuns[0] ?? null;
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
        };
      });

      const projects = (projectsRes.data ?? []).map((p: any) => ({
        ...p,
        tasks: taskCards.filter((t: any) => t.project_id === p.id),
      }));

      return {
        projects,
        allTasks: taskCards,
        recentEvents: eventsRes.data ?? [],
        officeEvents: (officeEventsRes.data ?? []) as OfficeEvent[],
      };
    },
  });
}

export function useRefreshOffice() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["office"] });
}

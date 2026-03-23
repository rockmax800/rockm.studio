import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";

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
      const [projectsRes, tasksRes, runsRes, reviewsRes, approvalsRes, eventsRes, officeEventsRes, autonomyRes, rolesRes, inboxApprovalsRes, predictionsRes] = await Promise.all([
        supabase.from("projects").select("*").neq("state", "archived").order("name"),
        supabase.from("tasks").select("id, title, state, project_id, owner_role_id, domain, priority").neq("state", "cancelled"),
        supabase.from("runs").select("id, task_id, state, run_number, agent_role_id").order("run_number", { ascending: false }),
        supabase.from("reviews").select("id, task_id, state, reviewer_role_id").in("state", ["created", "in_progress", "needs_clarification"]),
        supabase.from("approvals").select("id, target_id, target_type, state").eq("state", "pending"),
        supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("office_events").select("*").order("timestamp", { ascending: false }).limit(200),
        supabase.from("autonomy_settings").select("*").limit(10),
        supabase.from("agent_roles").select("id, name, code, success_rate, performance_score, status").eq("status", "active"),
        supabase.from("approvals").select("id").eq("state", "pending"),
        supabase.from("bottleneck_predictions").select("*").eq("resolved", false).order("created_at", { ascending: false }),
      ]);

      const tasks = tasksRes.data ?? [];
      const runs = runsRes.data ?? [];
      const reviews = reviewsRes.data ?? [];
      const approvals = approvalsRes.data ?? [];
      const roles = (rolesRes.data ?? []) as AgentRoleInfo[];
      const rolesById = Object.fromEntries(roles.map(r => [r.id, r]));
      const predictions = (predictionsRes.data ?? []) as BottleneckPrediction[];

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
          has_prediction: taskPredictions.length > 0,
          prediction_type: taskPredictions[0]?.prediction_type ?? null,
        };
      });

      const projects = (projectsRes.data ?? []).map((p: any) => ({
        ...p,
        tasks: taskCards.filter((t: any) => t.project_id === p.id),
      }));

      const autonomySettings = autonomyRes.data ?? [];
      const isLeanMode = autonomySettings.length === 0 || autonomySettings.some((s: any) => s.auto_execute_implementation === false);

      return {
        projects,
        allTasks: taskCards,
        recentEvents: eventsRes.data ?? [],
        officeEvents: (officeEventsRes.data ?? []) as OfficeEvent[],
        leanMode: isLeanMode,
        roles,
        pendingInboxCount: (inboxApprovalsRes.data ?? []).length,
        projectsInReview: projects.filter((p: any) => p.state === "in_review"),
        predictions,
        roleOverloads,
      };
    },
  });
}

// PART 3 — Real-time subscription hook: replaces polling
export function useOfficeRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    // Subscribe to office_events inserts via Supabase Realtime
    const channel = supabase
      .channel("office-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "office_events" },
        () => {
          // Invalidate office data to re-fetch with new event
          qc.invalidateQueries({ queryKey: ["office"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bottleneck_predictions" },
        () => {
          qc.invalidateQueries({ queryKey: ["office"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function useRefreshOffice() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["office"] });
}

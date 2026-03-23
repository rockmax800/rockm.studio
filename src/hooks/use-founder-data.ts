// Founder Pro Dashboard data hooks — all read-only, DB-driven via Supabase client

import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const THIRTY_MIN_MS = 30 * 60 * 1000;

// PART 1 — Bottleneck Analytics
export function useBottlenecks() {
  return useQuery({
    queryKey: ["founder", "bottlenecks"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - THIRTY_MIN_MS).toISOString();

      const [stuckRes, waitingRes, escalatedRes, blockedRes] = await Promise.all([
        supabase.from("tasks").select("id, title, state, updated_at, project_id, owner_role_id")
          .eq("state", "in_progress").lt("updated_at", cutoff),
        supabase.from("tasks").select("id, title, state, updated_at, project_id, owner_role_id")
          .eq("state", "waiting_review").lt("updated_at", cutoff),
        supabase.from("tasks").select("id, title, state, updated_at, project_id, escalation_reason")
          .eq("state", "escalated"),
        supabase.from("tasks").select("id, title, state, updated_at, project_id, blocker_reason")
          .eq("state", "blocked"),
      ]);

      return {
        tasksStuckInProgress: stuckRes.data ?? [],
        tasksWaitingReviewTooLong: waitingRes.data ?? [],
        escalationsUnresolved: escalatedRes.data ?? [],
        blockedTasks: blockedRes.data ?? [],
      };
    },
    refetchInterval: 30_000,
  });
}

// PART 2 — Agent Performance
export function useAgentPerformance() {
  return useQuery({
    queryKey: ["founder", "agents"],
    queryFn: async () => {
      const [rolesRes, usageRes] = await Promise.all([
        supabase.from("agent_roles").select("id, name, code, total_runs, success_rate, performance_score, status"),
        supabase.from("provider_usage_logs").select("run_id, latency_ms, estimated_cost_usd"),
      ]);

      const roles = rolesRes.data ?? [];
      const usage = usageRes.data ?? [];

      // Get run→role mapping
      const runIdsNeeded = [...new Set(usage.map(u => u.run_id).filter(Boolean))];
      let runRoleMap: Record<string, string> = {};
      if (runIdsNeeded.length > 0) {
        const runsRes = await supabase.from("runs").select("id, agent_role_id").in("id", runIdsNeeded.slice(0, 500));
        for (const r of runsRes.data ?? []) {
          runRoleMap[r.id] = r.agent_role_id;
        }
      }

      return roles.map(role => {
        const roleUsage = usage.filter(u => u.run_id && runRoleMap[u.run_id] === role.id);
        const avgLatency = roleUsage.length > 0
          ? Math.round(roleUsage.reduce((s, u) => s + (u.latency_ms ?? 0), 0) / roleUsage.length)
          : 0;
        const avgCost = roleUsage.length > 0
          ? roleUsage.reduce((s, u) => s + Number(u.estimated_cost_usd ?? 0), 0) / roleUsage.length
          : 0;

        return {
          id: role.id,
          name: role.name,
          code: role.code,
          status: role.status,
          total_runs: role.total_runs,
          success_rate: role.success_rate,
          performance_score: role.performance_score,
          avg_latency: avgLatency,
          avg_cost: Math.round(avgCost * 10000) / 10000,
        };
      });
    },
  });
}

// PART 3 — Token Spend / Costs
export function useCostAnalytics() {
  return useQuery({
    queryKey: ["founder", "costs"],
    queryFn: async () => {
      const [usageRes, providersRes, rolesRes, runsRes] = await Promise.all([
        supabase.from("provider_usage_logs").select("provider_id, run_id, estimated_cost_usd, total_tokens, created_at"),
        supabase.from("providers").select("id, name"),
        supabase.from("agent_roles").select("id, name"),
        supabase.from("runs").select("id, agent_role_id"),
      ]);

      const logs = usageRes.data ?? [];
      const providers = Object.fromEntries((providersRes.data ?? []).map(p => [p.id, p.name]));
      const roles = Object.fromEntries((rolesRes.data ?? []).map(r => [r.id, r.name]));
      const runRole = Object.fromEntries((runsRes.data ?? []).map(r => [r.id, r.agent_role_id]));

      const totalCost = logs.reduce((s, l) => s + Number(l.estimated_cost_usd ?? 0), 0);
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const cost24h = logs.filter(l => l.created_at > cutoff24h).reduce((s, l) => s + Number(l.estimated_cost_usd ?? 0), 0);

      const costByProvider: Record<string, number> = {};
      const costByRole: Record<string, number> = {};

      for (const l of logs) {
        const pName = l.provider_id ? (providers[l.provider_id] ?? "Unknown") : "Unknown";
        costByProvider[pName] = (costByProvider[pName] ?? 0) + Number(l.estimated_cost_usd ?? 0);

        const roleId = l.run_id ? runRole[l.run_id] : null;
        const rName = roleId ? (roles[roleId] ?? "Unknown") : "Unassigned";
        costByRole[rName] = (costByRole[rName] ?? 0) + Number(l.estimated_cost_usd ?? 0);
      }

      return {
        total_cost_project: Math.round(totalCost * 100) / 100,
        cost_last_24h: Math.round(cost24h * 100) / 100,
        cost_by_provider: Object.entries(costByProvider).map(([name, cost]) => ({ name, cost: Math.round(cost * 100) / 100 })),
        cost_by_role: Object.entries(costByRole).map(([name, cost]) => ({ name, cost: Math.round(cost * 100) / 100 })),
      };
    },
  });
}

// PART 4 — Risk Panel
export function useRiskAnalytics() {
  return useQuery({
    queryKey: ["founder", "risk"],
    queryFn: async () => {
      const [highRiskRes, failedRunsRes, autonomyRes, usageRes] = await Promise.all([
        supabase.from("run_evaluations").select("id, run_id, quality_score, validation_risk_level")
          .eq("validation_risk_level", "high").order("created_at", { ascending: false }).limit(20),
        supabase.from("runs").select("id, task_id, state, run_number, failure_reason")
          .eq("state", "failed").order("updated_at", { ascending: false }).limit(50),
        supabase.from("autonomy_settings").select("project_id, autonomy_token_budget"),
        supabase.from("provider_usage_logs").select("project_id, total_tokens"),
      ]);

      // Detect retry loops: tasks with 3+ failed runs
      const failedByTask: Record<string, number> = {};
      for (const r of failedRunsRes.data ?? []) {
        failedByTask[r.task_id] = (failedByTask[r.task_id] ?? 0) + 1;
      }
      const retryLoops = Object.entries(failedByTask)
        .filter(([, count]) => count >= 3)
        .map(([taskId, count]) => ({ taskId, failedCount: count }));

      // Budget remaining per project
      const tokensByProject: Record<string, number> = {};
      for (const l of usageRes.data ?? []) {
        if (l.project_id) tokensByProject[l.project_id] = (tokensByProject[l.project_id] ?? 0) + (l.total_tokens ?? 0);
      }

      const budgetStatus = (autonomyRes.data ?? []).map((s: any) => ({
        projectId: s.project_id,
        budget: s.autonomy_token_budget,
        used: tokensByProject[s.project_id] ?? 0,
        remaining: s.autonomy_token_budget - (tokensByProject[s.project_id] ?? 0),
      }));

      return {
        high_risk_validations: highRiskRes.data ?? [],
        repeated_failures: (failedRunsRes.data ?? []).length,
        retry_loops_detected: retryLoops,
        autonomy_budget_remaining: budgetStatus,
      };
    },
  });
}

// PART 5 — Founder Inbox
export function useFounderInbox() {
  return useQuery({
    queryKey: ["founder", "inbox"],
    queryFn: async () => {
      const [approvalsRes, escalatedRes, providersRes] = await Promise.all([
        supabase.from("approvals").select("id, project_id, approval_type, summary, target_type, created_at")
          .eq("state", "pending").order("created_at", { ascending: false }),
        supabase.from("tasks").select("id, title, project_id, escalation_reason, updated_at")
          .eq("state", "escalated").order("updated_at", { ascending: false }),
        supabase.from("providers").select("id, name, status"),
      ]);

      const degradedProviders = (providersRes.data ?? []).filter(p => p.status !== "active");

      return {
        pendingApprovals: approvalsRes.data ?? [],
        escalations: escalatedRes.data ?? [],
        budgetWarnings: [] as any[], // populated from risk data in UI
        providerDegradedWarnings: degradedProviders,
      };
    },
    refetchInterval: 15_000,
  });
}

// PART 3 — Employee Performance Aggregation Service
// Computes metrics from last 30 runs per employee.
// Read-only analytics — does not modify orchestration.

import { supabase } from "@/integrations/supabase/client";

export interface EmployeeMetrics {
  employee_id: string;
  success_rate: number;
  avg_cost: number;
  avg_latency: number;
  bug_rate: number;
  escalation_rate: number;
  reputation_score: number;
}

/**
 * PART 3 — Aggregate performance for all AI employees.
 * For each employee's role, looks at last 30 runs to compute metrics.
 */
export async function aggregateEmployeePerformance(): Promise<EmployeeMetrics[]> {
  // Get all active employees with their role mappings
  const { data: employees } = await supabase
    .from("ai_employees")
    .select("id, role_id, role_code")
    .in("status", ["active", "probation"]);

  if (!employees || employees.length === 0) return [];

  const roleIds = [...new Set(employees.map(e => e.role_id).filter(Boolean))];

  // Fetch last 30 runs per role
  const { data: runs } = await supabase
    .from("runs")
    .select("id, agent_role_id, state, duration_ms")
    .in("agent_role_id", roleIds as string[])
    .order("created_at", { ascending: false })
    .limit(500);

  // Fetch usage logs for cost
  const { data: usageLogs } = await supabase
    .from("provider_usage_logs")
    .select("run_id, estimated_cost_usd, latency_ms")
    .order("created_at", { ascending: false })
    .limit(500);

  // Fetch reviews for bug_rate
  const { data: reviews } = await supabase
    .from("reviews")
    .select("task_id, state, verdict")
    .in("state", ["resolved", "closed"])
    .order("created_at", { ascending: false })
    .limit(300);

  // Fetch tasks for escalation_rate
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, owner_role_id, state")
    .in("owner_role_id", roleIds as string[]);

  const allRuns = runs ?? [];
  const allUsage = usageLogs ?? [];
  const allReviews = reviews ?? [];
  const allTasks = tasks ?? [];

  // Index usage by run_id
  const usageByRun: Record<string, { cost: number; latency: number }> = {};
  for (const u of allUsage) {
    if (u.run_id) {
      usageByRun[u.run_id] = {
        cost: Number(u.estimated_cost_usd ?? 0),
        latency: Number(u.latency_ms ?? 0),
      };
    }
  }

  const results: EmployeeMetrics[] = [];

  for (const emp of employees) {
    if (!emp.role_id) continue;

    // Last 30 runs for this role
    const roleRuns = allRuns.filter(r => r.agent_role_id === emp.role_id).slice(0, 30);
    if (roleRuns.length === 0) {
      results.push({
        employee_id: emp.id,
        success_rate: 0,
        avg_cost: 0,
        avg_latency: 0,
        bug_rate: 0,
        escalation_rate: 0,
        reputation_score: 0,
      });
      continue;
    }

    // success_rate
    const successStates = ["finalized", "produced_output"];
    const successCount = roleRuns.filter(r => successStates.includes(r.state)).length;
    const successRate = successCount / roleRuns.length;

    // avg_cost and avg_latency from usage logs
    const runCosts = roleRuns
      .map(r => usageByRun[r.id])
      .filter(Boolean);
    const avgCost = runCosts.length > 0
      ? runCosts.reduce((sum, u) => sum + u.cost, 0) / runCosts.length
      : 0;
    const avgLatency = runCosts.length > 0
      ? runCosts.reduce((sum, u) => sum + u.latency, 0) / runCosts.length
      : 0;

    // bug_rate: rejected reviews / total runs
    const roleTasks = allTasks.filter(t => t.owner_role_id === emp.role_id);
    const roleTaskIds = new Set(roleTasks.map(t => t.id));
    const roleReviews = allReviews.filter(r => r.task_id && roleTaskIds.has(r.task_id));
    const rejectedCount = roleReviews.filter(r => r.verdict === "rejected").length;
    const bugRate = roleRuns.length > 0 ? rejectedCount / roleRuns.length : 0;

    // escalation_rate
    const escalatedCount = roleTasks.filter(t => t.state === "escalated").length;
    const escalationRate = roleTasks.length > 0 ? escalatedCount / roleTasks.length : 0;

    // Unified scoring via ScoringService
    const { computePerformanceScore } = await import("@/services/ScoringService");
    const reputationScore = computePerformanceScore({
      success_rate: successRate,
      avg_cost: avgCost,
      avg_latency: avgLatency,
      bug_rate: bugRate,
      escalation_rate: escalationRate,
    });

    results.push({
      employee_id: emp.id,
      success_rate: Math.round(successRate * 1000) / 1000,
      avg_cost: Math.round(avgCost * 100) / 100,
      avg_latency: Math.round(avgLatency),
      bug_rate: Math.round(bugRate * 1000) / 1000,
      escalation_rate: Math.round(escalationRate * 1000) / 1000,
      reputation_score: Math.round(reputationScore * 1000) / 1000,
    });
  }

  return results;
}

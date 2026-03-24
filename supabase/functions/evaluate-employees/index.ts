import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active employees
    const { data: employees } = await supabase
      .from("ai_employees")
      .select("id, role_id, role_code, name")
      .in("status", ["active", "probation"]);

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, evaluated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roleIds = [...new Set(employees.map(e => e.role_id).filter(Boolean))];

    // Fetch runs, usage, reviews, tasks in parallel
    const [runsRes, usageRes, reviewsRes, tasksRes] = await Promise.all([
      supabase.from("runs").select("id, agent_role_id, state, duration_ms")
        .in("agent_role_id", roleIds as string[])
        .order("created_at", { ascending: false }).limit(500),
      supabase.from("provider_usage_logs").select("run_id, estimated_cost_usd, latency_ms")
        .order("created_at", { ascending: false }).limit(500),
      supabase.from("reviews").select("task_id, verdict")
        .in("state", ["resolved", "closed"]).limit(300),
      supabase.from("tasks").select("id, owner_role_id, state")
        .in("owner_role_id", roleIds as string[]),
    ]);

    const runs = runsRes.data ?? [];
    const usage = usageRes.data ?? [];
    const reviews = reviewsRes.data ?? [];
    const tasks = tasksRes.data ?? [];

    // Index usage by run_id
    const usageByRun: Record<string, { cost: number; latency: number }> = {};
    for (const u of usage) {
      if (u.run_id) usageByRun[u.run_id] = { cost: Number(u.estimated_cost_usd ?? 0), latency: Number(u.latency_ms ?? 0) };
    }

    const successStates = ["finalized", "produced_output"];
    const now = new Date().toISOString();
    const suggestions: any[] = [];

    for (const emp of employees) {
      if (!emp.role_id) continue;

      const roleRuns = runs.filter(r => r.agent_role_id === emp.role_id).slice(0, 30);
      if (roleRuns.length === 0) continue;

      const successCount = roleRuns.filter(r => successStates.includes(r.state)).length;
      const successRate = successCount / roleRuns.length;

      const runCosts = roleRuns.map(r => usageByRun[r.id]).filter(Boolean);
      const avgCost = runCosts.length > 0 ? runCosts.reduce((s, u) => s + u.cost, 0) / runCosts.length : 0;
      const avgLatency = runCosts.length > 0 ? runCosts.reduce((s, u) => s + u.latency, 0) / runCosts.length : 0;

      const roleTasks = tasks.filter(t => t.owner_role_id === emp.role_id);
      const roleTaskIds = new Set(roleTasks.map(t => t.id));
      const roleReviews = reviews.filter(r => r.task_id && roleTaskIds.has(r.task_id));
      const rejectedCount = roleReviews.filter(r => r.verdict === "rejected").length;
      const bugRate = roleRuns.length > 0 ? rejectedCount / roleRuns.length : 0;

      const escalatedCount = roleTasks.filter(t => t.state === "escalated").length;
      const escalationRate = roleTasks.length > 0 ? escalatedCount / roleTasks.length : 0;

      const reputationScore =
        (successRate * 0.4) +
        (1 / (1 + avgCost)) * 0.2 +
        (1 / (1 + avgLatency / 1000)) * 0.1 -
        (bugRate * 0.2) -
        (escalationRate * 0.1);

      // Update employee metrics
      await supabase.from("ai_employees").update({
        success_rate: Math.round(successRate * 1000) / 1000,
        avg_cost: Math.round(avgCost * 100) / 100,
        avg_latency: Math.round(avgLatency),
        bug_rate: Math.round(bugRate * 1000) / 1000,
        escalation_rate: Math.round(escalationRate * 1000) / 1000,
        reputation_score: Math.round(reputationScore * 1000) / 1000,
        last_evaluated_at: now,
      }).eq("id", emp.id);

      // Generate suggestions
      if (successRate < 0.6 || bugRate > 0.3 || escalationRate > 0.2) {
        suggestions.push({
          employee_id: emp.id,
          suggestion_type: "replace",
          reason: `Consider replacing ${emp.name}: success ${(successRate * 100).toFixed(1)}%, bugs ${(bugRate * 100).toFixed(1)}%, escalations ${(escalationRate * 100).toFixed(1)}%`,
          resolved: false,
        });
      } else if (successRate > 0.9 && avgCost < 0.05 && avgLatency < 5000) {
        suggestions.push({
          employee_id: emp.id,
          suggestion_type: "promote",
          reason: `Promote ${emp.name}: ${(successRate * 100).toFixed(1)}% success, $${avgCost.toFixed(3)} cost, ${Math.round(avgLatency)}ms latency`,
          resolved: false,
        });
      }
    }

    // Mark old suggestions resolved and insert new
    await supabase.from("hr_suggestions").update({ resolved: true }).eq("resolved", false);
    if (suggestions.length > 0) {
      await supabase.from("hr_suggestions").insert(suggestions);
    }

    return new Response(
      JSON.stringify({ ok: true, evaluated: employees.length, suggestions: suggestions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

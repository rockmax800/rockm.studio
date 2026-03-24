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

    const now = Date.now();

    // 1. Get active tasks
    const { data: activeTasks } = await supabase
      .from("tasks")
      .select("id, state, owner_role_id, domain, updated_at, title")
      .in("state", ["in_progress", "waiting_review", "assigned"]);

    // 2. Get recent run durations by role (last 200 completed)
    const { data: completedRuns } = await supabase
      .from("runs")
      .select("agent_role_id, duration_ms")
      .in("state", ["finalized", "produced_output"])
      .not("duration_ms", "is", null)
      .order("ended_at", { ascending: false })
      .limit(200);

    const avgByRole: Record<string, number> = {};
    const countByRole: Record<string, number> = {};
    for (const r of completedRuns ?? []) {
      if (!countByRole[r.agent_role_id]) { countByRole[r.agent_role_id] = 0; avgByRole[r.agent_role_id] = 0; }
      if (countByRole[r.agent_role_id] < 20) {
        avgByRole[r.agent_role_id] += r.duration_ms;
        countByRole[r.agent_role_id]++;
      }
    }
    for (const id of Object.keys(avgByRole)) {
      avgByRole[id] = countByRole[id] > 0 ? avgByRole[id] / countByRole[id] : 0;
    }

    // 3. Get avg review duration
    const { data: closedReviews } = await supabase
      .from("reviews")
      .select("created_at, closed_at")
      .in("state", ["resolved", "closed"])
      .not("closed_at", "is", null)
      .order("closed_at", { ascending: false })
      .limit(100);

    let avgReviewMs = 30 * 60 * 1000;
    if (closedReviews && closedReviews.length > 0) {
      const durations = closedReviews.map(r => new Date(r.closed_at).getTime() - new Date(r.created_at).getTime());
      avgReviewMs = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    // 4. Role overload data
    const activeByRole: Record<string, number> = {};
    for (const t of activeTasks ?? []) {
      if (t.owner_role_id) activeByRole[t.owner_role_id] = (activeByRole[t.owner_role_id] ?? 0) + 1;
    }

    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const { data: recentDone } = await supabase
      .from("tasks")
      .select("owner_role_id")
      .eq("state", "done")
      .gte("closed_at", oneHourAgo);

    const completedByRole: Record<string, number> = {};
    for (const t of recentDone ?? []) {
      if (t.owner_role_id) completedByRole[t.owner_role_id] = (completedByRole[t.owner_role_id] ?? 0) + 1;
    }

    // 5. Compute predictions
    const predictions: any[] = [];

    for (const task of activeTasks ?? []) {
      const timeInState = now - new Date(task.updated_at).getTime();

      if (task.state === "in_progress" && task.owner_role_id) {
        const avg = avgByRole[task.owner_role_id];
        if (avg && avg > 0) {
          const ratio = timeInState / avg;
          if (ratio > 1.5) {
            predictions.push({
              task_id: task.id,
              prediction_type: "execution_delay",
              confidence_score: Math.min(0.95, Math.round((0.3 + (ratio - 1.5) * 0.25) * 100) / 100),
              explanation: `"${task.title}" in_progress ${Math.round(timeInState / 60000)}min, avg ${Math.round(avg / 60000)}min (${ratio.toFixed(1)}x)`,
              role_id: task.owner_role_id,
            });
          }
        }
      }

      if (task.state === "waiting_review") {
        const ratio = timeInState / avgReviewMs;
        if (ratio > 1.5) {
          predictions.push({
            task_id: task.id,
            prediction_type: "review_delay",
            confidence_score: Math.min(0.95, Math.round((0.3 + (ratio - 1.5) * 0.25) * 100) / 100),
            explanation: `"${task.title}" waiting review ${Math.round(timeInState / 60000)}min, avg ${Math.round(avgReviewMs / 60000)}min (${ratio.toFixed(1)}x)`,
            role_id: task.owner_role_id,
          });
        }
      }
    }

    // Role overloads
    for (const [roleId, count] of Object.entries(activeByRole)) {
      const baseline = Math.max(completedByRole[roleId] ?? 0, 1);
      if (count > baseline * 2) {
        const ratio = count / baseline;
        predictions.push({
          task_id: "00000000-0000-0000-0000-000000000000",
          prediction_type: "role_overload",
          confidence_score: Math.min(0.95, Math.round((0.4 + (ratio - 2) * 0.15) * 100) / 100),
          explanation: `Role has ${count} active, completed ${completedByRole[roleId] ?? 0}/hr (${ratio.toFixed(1)}x)`,
          role_id: roleId,
        });
      }
    }

    // 6. Store: mark old as resolved, insert new
    await supabase
      .from("bottleneck_predictions")
      .update({ resolved: true })
      .eq("resolved", false);

    if (predictions.length > 0) {
      await supabase.from("bottleneck_predictions").insert(
        predictions.map(p => ({ ...p, resolved: false }))
      );
    }

    return new Response(
      JSON.stringify({ ok: true, predictions_count: predictions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

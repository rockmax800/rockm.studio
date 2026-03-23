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

    // Load all employees, market models, and teams
    const [employeesRes, marketRes, teamsRes] = await Promise.all([
      supabase.from("ai_employees").select("*").in("status", ["active", "probation"]),
      supabase.from("model_market").select("*"),
      supabase.from("teams").select("id, name"),
    ]);

    const employees = employeesRes.data ?? [];
    const marketModels = marketRes.data ?? [];
    const teams = teamsRes.data ?? [];

    // Build market model lookup by provider+model
    const marketByKey: Record<string, any> = {};
    for (const m of marketModels) {
      marketByKey[`${m.provider}::${m.model_name}`] = m;
    }

    // Group employees by team_id + model
    const benchmarkMap: Record<string, {
      model_market_id: string;
      team_id: string | null;
      success_rates: number[];
      costs: number[];
      latencies: number[];
      bug_rates: number[];
    }> = {};

    for (const emp of employees) {
      const marketModel = marketByKey[`${emp.provider}::${emp.model_name}`];
      if (!marketModel) continue;

      const key = `${marketModel.id}::${emp.team_id ?? "global"}`;
      if (!benchmarkMap[key]) {
        benchmarkMap[key] = {
          model_market_id: marketModel.id,
          team_id: emp.team_id,
          success_rates: [],
          costs: [],
          latencies: [],
          bug_rates: [],
        };
      }
      benchmarkMap[key].success_rates.push(emp.success_rate);
      benchmarkMap[key].costs.push(emp.avg_cost);
      benchmarkMap[key].latencies.push(emp.avg_latency);
      benchmarkMap[key].bug_rates.push(emp.bug_rate);
    }

    // Upsert benchmarks
    let upserted = 0;
    for (const entry of Object.values(benchmarkMap)) {
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      const { error } = await supabase.from("model_benchmarks").upsert(
        {
          model_market_id: entry.model_market_id,
          team_id: entry.team_id,
          avg_success_rate: Math.round(avg(entry.success_rates) * 1000) / 1000,
          avg_cost: Math.round(avg(entry.costs) * 10000) / 10000,
          avg_latency: Math.round(avg(entry.latencies)),
          bug_rate: Math.round(avg(entry.bug_rates) * 1000) / 1000,
          sample_size: entry.success_rates.length,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "model_market_id,team_id" }
      );
      if (!error) upserted++;
    }

    return new Response(
      JSON.stringify({ ok: true, benchmarks_updated: upserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

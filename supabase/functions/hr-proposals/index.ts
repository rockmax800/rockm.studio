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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Expected: /hr-proposals or /hr-proposals/:id/approve or /hr-proposals/:id/execute
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // POST /hr-proposals/generate — generate candidates for an employee
    if (req.method === "POST" && pathParts.includes("generate")) {
      const { employee_id } = body;
      if (!employee_id) {
        return new Response(JSON.stringify({ error: "employee_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load employee
      const { data: emp } = await supabase.from("ai_employees").select("*").eq("id", employee_id).single();
      if (!emp) {
        return new Response(JSON.stringify({ error: "Employee not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load models, providers, prompts, other employees
      const [modelsRes, providersRes, promptsRes, othersRes] = await Promise.all([
        supabase.from("provider_models").select("id, model_code, display_name, provider_id, status").eq("status", "active"),
        supabase.from("providers").select("id, name, code, status").eq("status", "active"),
        supabase.from("prompt_versions").select("id, role_id, version_number, is_active").eq("role_id", emp.role_id ?? "").order("version_number", { ascending: false }).limit(5),
        supabase.from("ai_employees").select("*").neq("id", employee_id).in("status", ["active"]),
      ]);

      const models = modelsRes.data ?? [];
      const providers = providersRes.data ?? [];
      const prompts = promptsRes.data ?? [];
      const others = othersRes.data ?? [];
      const providersById = Object.fromEntries(providers.map((p: any) => [p.id, p]));
      const candidates: any[] = [];

      // Strategy 1: Same provider, better model
      const sameProvModels = models.filter((m: any) => {
        const p = providersById[m.provider_id];
        return p && p.code === emp.provider && m.model_code !== emp.model_name;
      });
      if (sameProvModels.length > 0) {
        const bestModel = sameProvModels[0];
        const provCode = providersById[bestModel.provider_id]?.code ?? emp.provider;
        const ref = others.find((e: any) => e.model_name === bestModel.model_code);
        candidates.push({
          employee_id,
          suggested_provider: provCode,
          suggested_model: bestModel.model_code,
          suggested_prompt_version_id: emp.prompt_version_id,
          projected_success_rate: ref ? ref.success_rate : Math.min(emp.success_rate + 0.15, 0.95),
          projected_cost: ref ? ref.avg_cost : emp.avg_cost * 1.1,
          projected_latency: ref ? ref.avg_latency : emp.avg_latency * 0.9,
          reason: `Upgrade to ${bestModel.display_name} on ${provCode}. ${ref ? `Based on ${ref.name}.` : "Projected."}`,
        });
      }

      // Strategy 2: Different provider
      const diffProviders = providers.filter((p: any) => p.code !== emp.provider);
      if (diffProviders.length > 0) {
        const altProv = diffProviders[0];
        const altModel = models.find((m: any) => m.provider_id === altProv.id);
        if (altModel) {
          const ref = others.find((e: any) => e.provider === altProv.code);
          candidates.push({
            employee_id,
            suggested_provider: altProv.code,
            suggested_model: altModel.model_code,
            suggested_prompt_version_id: emp.prompt_version_id,
            projected_success_rate: ref ? ref.success_rate : Math.min(emp.success_rate + 0.2, 0.95),
            projected_cost: ref ? ref.avg_cost : emp.avg_cost,
            projected_latency: ref ? ref.avg_latency : emp.avg_latency,
            reason: `Switch to ${altProv.name} with ${altModel.display_name}. ${ref ? `Based on ${ref.name}.` : "Projected."}`,
          });
        }
      }

      // Strategy 3: Same model, different prompt
      const altPrompts = prompts.filter((p: any) => p.id !== emp.prompt_version_id);
      if (altPrompts.length > 0) {
        const altPrompt = altPrompts[0];
        candidates.push({
          employee_id,
          suggested_provider: emp.provider,
          suggested_model: emp.model_name,
          suggested_prompt_version_id: altPrompt.id,
          projected_success_rate: Math.min(emp.success_rate + 0.1, 0.95),
          projected_cost: emp.avg_cost,
          projected_latency: emp.avg_latency,
          reason: `Keep model, switch to prompt v${altPrompt.version_number}.`,
        });
      }

      const toInsert = candidates.slice(0, 3);
      if (toInsert.length > 0) {
        await supabase.from("candidate_proposals").insert(toInsert);
      }

      return new Response(JSON.stringify({ ok: true, candidates: toInsert.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /hr-proposals/:id/approve
    if (req.method === "POST" && pathParts.includes("approve")) {
      const proposalId = pathParts[pathParts.indexOf("approve") - 1];
      const { error } = await supabase.from("candidate_proposals").update({ approved: true }).eq("id", proposalId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /hr-proposals/:id/execute
    if (req.method === "POST" && pathParts.includes("execute")) {
      const proposalId = pathParts[pathParts.indexOf("execute") - 1];

      // Load proposal
      const { data: proposal } = await supabase.from("candidate_proposals").select("*").eq("id", proposalId).single();
      if (!proposal) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!proposal.approved) {
        return new Response(JSON.stringify({ error: "Not approved" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (proposal.executed) {
        return new Response(JSON.stringify({ error: "Already executed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Load old employee
      const { data: oldEmp } = await supabase.from("ai_employees").select("*").eq("id", proposal.employee_id).single();
      if (!oldEmp) {
        return new Response(JSON.stringify({ error: "Employee not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Safety: check no active tasks
      if (oldEmp.role_id) {
        const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true })
          .eq("owner_role_id", oldEmp.role_id).in("state", ["in_progress", "assigned", "waiting_review"]);
        if (count && count > 0) {
          return new Response(JSON.stringify({ error: `Employee has ${count} active tasks` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Generate unique name
      const { data: allEmps } = await supabase.from("ai_employees").select("name");
      const FIRSTS = ["Alex","Maya","Daniel","Sofia","Leo","Ava","Noah","Isla","Kai","Elena","Ethan","Mia","Lucas","Aria","Liam","Zara","Owen","Nina","Ravi","Hana"];
      const LASTS = ["Mercer","Chen","Novak","Alvarez","Nakamura","Singh","Park","Dubois","Costa","Berg","Kim","Torres","Reeves","Zhao","Okafor","Sato","Müller","Silva","Petrov","Larsen"];
      const usedNames = new Set((allEmps ?? []).map((e: any) => e.name));
      let newName = "";
      for (let i = 0; i < 100; i++) {
        const f = FIRSTS[(i * 7 + oldEmp.role_code.length) % FIRSTS.length];
        const l = LASTS[(i * 13 + 3) % LASTS.length];
        const candidate = `${f} ${l}`;
        if (!usedNames.has(candidate)) { newName = candidate; break; }
      }
      if (!newName) newName = `Agent-${Date.now().toString(36)}`;

      // Create new employee
      const { data: newEmp, error: insertErr } = await supabase.from("ai_employees").insert({
        name: newName,
        team_id: oldEmp.team_id,
        role_id: oldEmp.role_id,
        role_code: oldEmp.role_code,
        provider: proposal.suggested_provider,
        model_name: proposal.suggested_model,
        prompt_version_id: proposal.suggested_prompt_version_id,
        status: "active",
      }).select().single();

      if (insertErr) {
        return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Soft fire old employee
      await supabase.from("ai_employees").update({ status: "inactive" }).eq("id", proposal.employee_id);

      // Mark executed
      await supabase.from("candidate_proposals").update({ executed: true }).eq("id", proposalId);

      return new Response(JSON.stringify({ ok: true, new_employee: newEmp, old_employee_id: proposal.employee_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET — list proposals
    const { data: proposals } = await supabase
      .from("candidate_proposals")
      .select("*, ai_employees!candidate_proposals_employee_id_fkey(name, role_code)")
      .order("created_at", { ascending: false })
      .limit(50);

    return new Response(JSON.stringify({ proposals: proposals ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

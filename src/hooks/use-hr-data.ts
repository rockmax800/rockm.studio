// PART 5 — HR Dashboard data hook
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { generateHRSuggestions } from "@/services/HRSuggestionService";

export function useHRDashboard() {
  return useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: async () => {
      const [employeesRes, suggestionsRes, teamsRes, runsRes, usageRes, reviewsRes, tasksRes] = await Promise.all([
        supabase.from("ai_employees").select("*").order("name"),
        supabase.from("hr_suggestions").select("*").eq("resolved", false).order("created_at", { ascending: false }),
        supabase.from("teams").select("id, name"),
        supabase.from("runs").select("id, agent_role_id, state, duration_ms").order("created_at", { ascending: false }).limit(500),
        supabase.from("provider_usage_logs").select("run_id, estimated_cost_usd, latency_ms").order("created_at", { ascending: false }).limit(500),
        supabase.from("reviews").select("task_id, verdict").in("state", ["approved", "approved_with_notes", "rejected", "closed"]).limit(300),
        supabase.from("tasks").select("id, owner_role_id, state").limit(500),
      ]);

      const employees = employeesRes.data ?? [];
      const storedSuggestions = suggestionsRes.data ?? [];
      const teams = teamsRes.data ?? [];
      const teamsById = Object.fromEntries(teams.map(t => [t.id, t]));

      // Compute live suggestions from current metrics
      const liveSuggestions = generateHRSuggestions(
        employees.map((e: any) => ({
          id: e.id,
          name: e.name,
          success_rate: e.success_rate,
          avg_cost: e.avg_cost,
          avg_latency: e.avg_latency,
          bug_rate: e.bug_rate,
          escalation_rate: e.escalation_rate,
          reputation_score: e.reputation_score,
        }))
      );

      const enrichedEmployees = employees.map((e: any) => ({
        ...e,
        department: e.team_id ? teamsById[e.team_id]?.name ?? "Unassigned" : "Unassigned",
      }));

      return {
        employees: enrichedEmployees,
        suggestions: liveSuggestions,
        storedSuggestions,
        totalActive: employees.filter((e: any) => e.status === "active").length,
        totalProbation: employees.filter((e: any) => e.status === "probation").length,
        totalInactive: employees.filter((e: any) => e.status === "inactive").length,
        avgReputation: employees.length > 0
          ? Math.round(employees.reduce((s: number, e: any) => s + (e.reputation_score ?? 0), 0) / employees.length * 1000) / 1000
          : 0,
      };
    },
  });
}

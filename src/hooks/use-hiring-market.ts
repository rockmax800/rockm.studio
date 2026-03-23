// Hiring Market data hook
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { rankModels, generateUpgradeSuggestions } from "@/services/ModelCompetitionService";

export function useHiringMarket() {
  return useQuery({
    queryKey: ["hiring-market"],
    queryFn: async () => {
      const [marketRes, benchmarksRes, employeesRes, teamsRes, experimentsRes] = await Promise.all([
        supabase.from("model_market" as any).select("*").order("provider"),
        supabase.from("model_benchmarks" as any).select("*"),
        supabase.from("ai_employees").select("id, name, provider, model_name, team_id, success_rate, avg_cost, avg_latency, status, role_code"),
        supabase.from("teams").select("id, name"),
        supabase.from("prompt_experiments").select("*").eq("status", "active"),
      ]);

      const marketModels = (marketRes.data ?? []) as any[];
      const benchmarks = (benchmarksRes.data ?? []) as any[];
      const employees = (employeesRes.data ?? []) as any[];
      const teams = (teamsRes.data ?? []) as any[];
      const experiments = (experimentsRes.data ?? []) as any[];

      // Rank models globally
      const ranked = rankModels(marketModels, benchmarks, null);

      // Generate upgrade suggestions
      const upgradeSuggestions = generateUpgradeSuggestions(ranked, employees, teams);

      // Per-team benchmarks
      const departmentBenchmarks = teams.map((team: any) => ({
        team_id: team.id,
        team_name: team.name,
        ranked: rankModels(marketModels, benchmarks, team.id),
      }));

      // Build experiment lookup by role_id for office viz
      const experimentsByRoleId: Record<string, boolean> = {};
      for (const exp of experiments) {
        experimentsByRoleId[exp.role_id] = true;
      }

      // Determine top performers per team
      const topPerformerModels: Record<string, string> = {};
      for (const team of teams) {
        const teamRanked = rankModels(marketModels, benchmarks, team.id);
        if (teamRanked.length > 0) {
          topPerformerModels[team.id] = teamRanked[0].model_name;
        }
      }

      return {
        rankedModels: ranked,
        departmentBenchmarks,
        upgradeSuggestions,
        marketModels,
        experiments,
        experimentsByRoleId,
        topPerformerModels,
        totalModels: marketModels.length,
        totalBenchmarks: benchmarks.length,
      };
    },
  });
}

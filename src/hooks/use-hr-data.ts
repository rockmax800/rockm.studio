// PART 5 — HR Dashboard data hook (extended with proposals)
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateHRSuggestions } from "@/services/HRSuggestionService";
import { toast } from "sonner";

export function useHRDashboard() {
  return useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: async () => {
      const [employeesRes, suggestionsRes, teamsRes, proposalsRes] = await Promise.all([
        supabase.from("ai_employees").select("*").order("name"),
        supabase.from("hr_suggestions").select("*").eq("resolved", false).order("created_at", { ascending: false }),
        supabase.from("teams").select("id, name"),
        supabase.from("candidate_proposals" as any).select("*").order("created_at", { ascending: false }).limit(50),
      ]);

      const employees = employeesRes.data ?? [];
      const storedSuggestions = suggestionsRes.data ?? [];
      const teams = teamsRes.data ?? [];
      const proposals = proposalsRes.data ?? [];
      const teamsById = Object.fromEntries(teams.map(t => [t.id, t]));

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

      // Enrich proposals with employee name
      const employeesById = Object.fromEntries(employees.map((e: any) => [e.id, e]));
      const enrichedProposals = proposals.map((p: any) => ({
        ...p,
        employee_name: employeesById[p.employee_id]?.name ?? "Unknown",
        employee_role: employeesById[p.employee_id]?.role_code ?? "unknown",
      }));

      return {
        employees: enrichedEmployees,
        suggestions: liveSuggestions,
        storedSuggestions,
        proposals: enrichedProposals,
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

export function useGenerateCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) => {
      const res = await supabase.functions.invoke("hr-proposals", {
        method: "POST",
        body: { employee_id: employeeId },
        headers: { "x-action": "generate" },
      });
      // Use the edge function generate endpoint
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hr-proposals/generate`;
      const response = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ employee_id: employeeId }),
      });
      if (!response.ok) throw new Error("Failed to generate candidates");
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      toast.success("Replacement candidates generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from("candidate_proposals" as any)
        .update({ approved: true })
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      toast.success("Proposal approved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useExecuteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposalId: string) => {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hr-proposals/${proposalId}/execute`;
      const response = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: "{}",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to execute replacement");
      }
      return response.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-dashboard"] });
      qc.invalidateQueries({ queryKey: ["office"] });
      toast.success("Replacement executed — new employee hired");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

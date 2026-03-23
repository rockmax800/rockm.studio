// PART 2 — Candidate Generation Logic
// Generates 2–3 replacement candidate proposals for underperforming employees.
// Uses historical data from other employees/providers for projections.

import { supabase } from "@/integrations/supabase/client";

export interface CandidateProposal {
  employee_id: string;
  suggested_provider: string | null;
  suggested_model: string | null;
  suggested_prompt_version_id: string | null;
  projected_success_rate: number;
  projected_cost: number;
  projected_latency: number;
  reason: string;
}

/**
 * Generate 2–3 replacement candidates for a given underperforming employee.
 * Strategies:
 *   1) Same provider, better model
 *   2) Different provider
 *   3) Same model, different prompt version
 */
export async function generateCandidates(employeeId: string): Promise<CandidateProposal[]> {
  // Load the current employee
  const { data: employee } = await supabase
    .from("ai_employees")
    .select("*")
    .eq("id", employeeId)
    .single();

  if (!employee) return [];

  // Load all provider models for candidate options
  const [modelsRes, providersRes, promptsRes, otherEmployeesRes] = await Promise.all([
    supabase.from("provider_models").select("id, model_code, display_name, provider_id, status").eq("status", "active"),
    supabase.from("providers").select("id, name, code, status").eq("status", "active"),
    supabase.from("prompt_versions").select("id, role_id, version_number, is_active").eq("role_id", employee.role_id ?? "").order("version_number", { ascending: false }).limit(5),
    supabase.from("ai_employees").select("*").neq("id", employeeId).in("status", ["active"]),
  ]);

  const models = modelsRes.data ?? [];
  const providers = providersRes.data ?? [];
  const prompts = promptsRes.data ?? [];
  const otherEmployees = otherEmployeesRes.data ?? [];

  const providersById = Object.fromEntries(providers.map(p => [p.id, p]));
  const candidates: CandidateProposal[] = [];

  // Strategy 1: Same provider, better model
  const sameProviderModels = models.filter(
    m => {
      const p = providersById[m.provider_id];
      return p && p.code === employee.provider && m.model_code !== employee.model_name;
    }
  );
  if (sameProviderModels.length > 0) {
    const bestModel = sameProviderModels[0];
    const providerName = providersById[bestModel.provider_id]?.code ?? employee.provider;
    // Look for existing employees using this model for projection
    const ref = otherEmployees.find(e => e.model_name === bestModel.model_code);
    candidates.push({
      employee_id: employeeId,
      suggested_provider: providerName,
      suggested_model: bestModel.model_code,
      suggested_prompt_version_id: employee.prompt_version_id,
      projected_success_rate: ref ? ref.success_rate : Math.min(employee.success_rate + 0.15, 0.95),
      projected_cost: ref ? ref.avg_cost : employee.avg_cost * 1.1,
      projected_latency: ref ? ref.avg_latency : employee.avg_latency * 0.9,
      reason: `Upgrade to ${bestModel.display_name} on same provider (${providerName}). ${ref ? `Based on ${ref.name}'s metrics.` : "Projected from provider averages."}`,
    });
  }

  // Strategy 2: Different provider
  const differentProviders = providers.filter(p => p.code !== employee.provider);
  if (differentProviders.length > 0) {
    const altProvider = differentProviders[0];
    const altModels = models.filter(m => m.provider_id === altProvider.id);
    const altModel = altModels[0];
    if (altModel) {
      const ref = otherEmployees.find(e => e.provider === altProvider.code);
      candidates.push({
        employee_id: employeeId,
        suggested_provider: altProvider.code,
        suggested_model: altModel.model_code,
        suggested_prompt_version_id: employee.prompt_version_id,
        projected_success_rate: ref ? ref.success_rate : Math.min(employee.success_rate + 0.2, 0.95),
        projected_cost: ref ? ref.avg_cost : employee.avg_cost,
        projected_latency: ref ? ref.avg_latency : employee.avg_latency,
        reason: `Switch to ${altProvider.name} with ${altModel.display_name}. ${ref ? `Based on ${ref.name}'s metrics.` : "Projected from provider averages."}`,
      });
    }
  }

  // Strategy 3: Same model, different prompt version
  const altPrompts = prompts.filter(p => p.id !== employee.prompt_version_id);
  if (altPrompts.length > 0) {
    const altPrompt = altPrompts[0];
    candidates.push({
      employee_id: employeeId,
      suggested_provider: employee.provider,
      suggested_model: employee.model_name,
      suggested_prompt_version_id: altPrompt.id,
      projected_success_rate: Math.min(employee.success_rate + 0.1, 0.95),
      projected_cost: employee.avg_cost,
      projected_latency: employee.avg_latency,
      reason: `Keep ${employee.model_name} but switch to prompt version ${altPrompt.version_number}. May improve output quality without cost change.`,
    });
  }

  return candidates.slice(0, 3);
}

/**
 * Generate and persist candidate proposals for an employee.
 */
export async function generateAndStoreCandidates(employeeId: string) {
  const candidates = await generateCandidates(employeeId);
  if (candidates.length === 0) return [];

  const { data, error } = await supabase
    .from("candidate_proposals" as any)
    .insert(candidates)
    .select();

  if (error) throw error;
  return data;
}

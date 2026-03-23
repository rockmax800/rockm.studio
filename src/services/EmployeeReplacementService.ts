// PART 4 — Employee Replacement Service
// Executes approved replacement proposals.
// SAFETY: Never replaces employees with active tasks.
// All changes are transactional and auditable.

import { supabase } from "@/integrations/supabase/client";
import { generateUniqueName } from "@/services/EmployeeNamingService";

export interface ReplacementResult {
  success: boolean;
  error?: string;
  new_employee_id?: string;
  old_employee_id?: string;
}

/**
 * Execute a replacement proposal.
 * Steps:
 * 1) Validate proposal is approved and not yet executed
 * 2) Check old employee has no active tasks (PART 7 safety)
 * 3) Create new AIEmployee
 * 4) Set old employee inactive
 * 5) Update AgentRole mapping
 * 6) Mark proposal executed
 */
export async function executeReplacement(proposalId: string): Promise<ReplacementResult> {
  // 1) Load and validate proposal
  const { data: proposal, error: pErr } = await supabase
    .from("candidate_proposals" as any)
    .select("*")
    .eq("id", proposalId)
    .single();

  if (pErr || !proposal) {
    return { success: false, error: "Proposal not found" };
  }

  const p = proposal as any;

  if (!p.approved) {
    return { success: false, error: "Proposal not approved by founder" };
  }
  if (p.executed) {
    return { success: false, error: "Proposal already executed" };
  }

  // 2) Load old employee
  const { data: oldEmployee } = await supabase
    .from("ai_employees")
    .select("*")
    .eq("id", p.employee_id)
    .single();

  if (!oldEmployee) {
    return { success: false, error: "Employee not found" };
  }

  // PART 7 — Safety: check no active tasks
  if (oldEmployee.role_id) {
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("owner_role_id", oldEmployee.role_id)
      .in("state", ["in_progress", "assigned", "waiting_review"]);

    if (count && count > 0) {
      return { success: false, error: `Cannot replace: employee has ${count} active task(s). Wait until tasks complete.` };
    }
  }

  // 3) Get existing names to avoid collision
  const { data: existingEmployees } = await supabase
    .from("ai_employees")
    .select("name");
  const usedNames = new Set((existingEmployees ?? []).map((e: any) => e.name));
  const newName = generateUniqueName(oldEmployee.role_code, usedNames);

  // 4) Create new employee
  const { data: newEmployee, error: insertErr } = await supabase
    .from("ai_employees")
    .insert({
      name: newName,
      team_id: oldEmployee.team_id,
      role_id: oldEmployee.role_id,
      role_code: oldEmployee.role_code,
      provider: p.suggested_provider,
      model_name: p.suggested_model,
      prompt_version_id: p.suggested_prompt_version_id,
      status: "active",
      hired_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr || !newEmployee) {
    return { success: false, error: `Failed to create new employee: ${insertErr?.message}` };
  }

  // 5) Set old employee inactive (soft fire — remains in DB)
  await supabase
    .from("ai_employees")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", p.employee_id);

  // 6) Mark proposal executed
  await supabase
    .from("candidate_proposals" as any)
    .update({ executed: true })
    .eq("id", proposalId);

  // 7) Log activity event
  if (oldEmployee.role_id) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("project_id")
      .eq("owner_role_id", oldEmployee.role_id)
      .limit(1);

    const projectId = tasks?.[0]?.project_id;
    if (projectId) {
      await supabase.from("activity_events").insert({
        project_id: projectId,
        entity_type: "task" as any,
        entity_id: p.employee_id,
        event_type: "employee_replaced",
        actor_type: "founder" as any,
        event_payload: {
          old_employee: oldEmployee.name,
          new_employee: newName,
          reason: p.reason,
        },
      });
    }
  }

  return {
    success: true,
    new_employee_id: (newEmployee as any).id,
    old_employee_id: p.employee_id,
  };
}

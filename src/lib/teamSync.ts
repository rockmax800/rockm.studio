import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_OPTIONS } from "@/lib/employeeConfig";

const TEAM_QUERY_KEYS = [
  ["departments"],
  ["department_stats"],
  ["all-employees-full"],
  ["all-roles-teams"],
  ["hr-dashboard"],
  ["team-room-employees"],
  ["team-room-teams"],
  ["office"],
  ["office-roles-profile"],
  ["employees-for-assign"],
] as const;

export async function refreshTeamViews(queryClient: QueryClient, reason: string) {
  console.log(`[TeamSync] ${reason}`);

  await Promise.all(
    TEAM_QUERY_KEYS.flatMap((queryKey) => [
      queryClient.invalidateQueries({ queryKey: [...queryKey] }),
      queryClient.refetchQueries({ queryKey: [...queryKey], type: "active" }),
    ])
  );
}

export async function ensureCapabilityRole(params: {
  teamId: string;
  roleCode: string;
  sourceRoleId?: string | null;
}) {
  const { teamId, roleCode, sourceRoleId } = params;

  const { data: existingRole, error: existingRoleError } = await supabase
    .from("agent_roles")
    .select("id")
    .eq("code", roleCode)
    .eq("team_id", teamId)
    .maybeSingle();

  if (existingRoleError) throw existingRoleError;
  if (existingRole?.id) return existingRole.id;

  let skillProfile: Record<string, unknown> = {};

  if (sourceRoleId) {
    const { data: sourceRole, error: sourceRoleError } = await supabase
      .from("agent_roles")
      .select("skill_profile")
      .eq("id", sourceRoleId)
      .maybeSingle();

    if (sourceRoleError) throw sourceRoleError;
    skillProfile = (sourceRole?.skill_profile as Record<string, unknown> | null) ?? {};
  }

  const roleLabel = ROLE_OPTIONS.find((role) => role.code === roleCode)?.label ?? roleCode;
  const { data: createdRole, error: createdRoleError } = await supabase
    .from("agent_roles")
    .insert({
      code: roleCode,
      name: roleLabel,
      description: roleLabel,
      team_id: teamId,
      skill_profile: skillProfile,
    })
    .select("id")
    .single();

  if (createdRoleError) throw createdRoleError;

  return createdRole.id;
}

export async function assignEmployeeToCapability(params: {
  employeeId: string;
  teamId: string;
  roleCode: string;
  sourceRoleId?: string | null;
}) {
  const { employeeId, teamId, roleCode, sourceRoleId } = params;
  const roleId = await ensureCapabilityRole({ teamId, roleCode, sourceRoleId });

  const { error } = await supabase
    .from("ai_employees")
    .update({ team_id: teamId, role_id: roleId })
    .eq("id", employeeId);

  if (error) throw error;

  console.log("[TeamSync] Capability updated", { employeeId, teamId, roleId });

  return roleId;
}
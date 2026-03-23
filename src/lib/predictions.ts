// GET /api/dashboard/predictions — Founder predictions panel (PART 6)

import { supabase } from "@/integrations/supabase/client";

export async function fetchPredictions() {
  const [predictionsRes, rolesRes] = await Promise.all([
    supabase.from("bottleneck_predictions").select("*").eq("resolved", false).order("created_at", { ascending: false }),
    supabase.from("agent_roles").select("id, name, code"),
  ]);

  const predictions = predictionsRes.data ?? [];
  const rolesById = Object.fromEntries((rolesRes.data ?? []).map((r: any) => [r.id, r]));

  const execDelays = predictions
    .filter(p => p.prediction_type === "execution_delay")
    .map(p => ({ ...p, role: p.role_id ? rolesById[p.role_id] : null }));

  const reviewDelays = predictions
    .filter(p => p.prediction_type === "review_delay")
    .map(p => ({ ...p, role: p.role_id ? rolesById[p.role_id] : null }));

  const overloadedRoles = predictions
    .filter(p => p.prediction_type === "role_overload")
    .map(p => ({ ...p, role: p.role_id ? rolesById[p.role_id] : null }));

  return {
    predictedExecutionDelays: execDelays,
    predictedReviewDelays: reviewDelays,
    overloadedRoles,
  };
}

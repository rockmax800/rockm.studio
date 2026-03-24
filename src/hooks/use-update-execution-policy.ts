/* ═══════════════════════════════════════════════════════════
   useUpdateExecutionPolicy — saves execution defaults into
   system_settings.experimental_features.execution_defaults.

   Merges into the existing experimental_features JSON without
   overwriting other feature flags.
   ═══════════════════════════════════════════════════════════ */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExecutionPolicySettings } from "@/types/execution";

export function useUpdateExecutionPolicy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (defaults: ExecutionPolicySettings) => {
      // Read current row
      const { data: current, error: readErr } = await supabase
        .from("system_settings" as any)
        .select("*")
        .limit(1)
        .single();

      if (readErr || !current) throw new Error("System settings not found");

      const existing = (current as any).experimental_features ?? {};

      const updatedFeatures = {
        ...existing,
        execution_defaults: {
          execution_engine: defaults.execution_engine,
          provider_family: defaults.provider_family,
          model_name: defaults.model_name,
          orchestration_mode: defaults.orchestration_mode,
          fallback_provider_family: defaults.fallback_provider_family ?? null,
          fallback_model_name: defaults.fallback_model_name ?? null,
        },
      };

      const { error: writeErr } = await supabase
        .from("system_settings" as any)
        .update({
          experimental_features: updatedFeatures,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (current as any).id);

      if (writeErr) throw writeErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-mode"] });
    },
  });
}

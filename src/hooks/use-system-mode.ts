// Hook to read and switch system mode
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExperimentalFeatures, SystemMode } from "@/services/SystemModeService";

interface SystemSettings {
  id: string;
  mode: SystemMode;
  experimental_features: ExperimentalFeatures;
  updated_at: string;
}

export function useSystemMode() {
  return useQuery({
    queryKey: ["system-mode"],
    queryFn: async (): Promise<SystemSettings> => {
      const { data, error } = await supabase
        .from("system_settings" as any)
        .select("*")
        .limit(1)
        .single();

      if (error || !data) {
        return {
          id: "",
          mode: "production" as SystemMode,
          experimental_features: {
            enable_autonomy: false,
            enable_dual_verification: false,
            enable_self_review: false,
            enable_context_compression: false,
            enable_model_competition: false,
            enable_prompt_experiments: false,
            enable_blog: false,
          },
          updated_at: new Date().toISOString(),
        };
      }
      return data as unknown as SystemSettings;
    },
    staleTime: 30_000,
  });
}

export function useSwitchMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mode, experimental_features }: { mode: SystemMode; experimental_features?: Partial<ExperimentalFeatures> }) => {
      // Get current settings
      const { data: current } = await supabase
        .from("system_settings" as any)
        .select("*")
        .limit(1)
        .single();

      if (!current) throw new Error("System settings not found");

      const updatePayload: Record<string, unknown> = {
        mode,
        updated_at: new Date().toISOString(),
      };

      if (mode === "production") {
        updatePayload.experimental_features = {
          enable_autonomy: false,
          enable_dual_verification: false,
          enable_self_review: false,
          enable_context_compression: false,
          enable_model_competition: false,
          enable_prompt_experiments: false,
          enable_blog: false,
        };
      } else if (experimental_features) {
        const currentFeatures = (current as any).experimental_features ?? {};
        updatePayload.experimental_features = { ...currentFeatures, ...experimental_features };
      }

      const { error } = await supabase
        .from("system_settings" as any)
        .update(updatePayload)
        .eq("id", (current as any).id);

      if (error) throw error;

      return { mode, previous_mode: (current as any).mode };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-mode"] });
      qc.invalidateQueries({ queryKey: ["office"] });
    },
  });
}

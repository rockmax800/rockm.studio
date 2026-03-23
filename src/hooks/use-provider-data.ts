import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useProviderList() {
  return useQuery({
    queryKey: ["control", "providers"],
    queryFn: async () => {
      const [providersRes, modelsRes, usageRes, credentialsRes] = await Promise.all([
        supabase.from("providers").select("*").order("name"),
        supabase.from("provider_models").select("id, provider_id, status"),
        supabase.from("provider_usage_logs").select("id, provider_id, created_at").gte("created_at", new Date(Date.now() - 86400000).toISOString()),
        supabase.from("provider_credentials").select("id, provider_id, status"),
      ]);

      const providers = providersRes.data ?? [];
      const models = modelsRes.data ?? [];
      const usage = usageRes.data ?? [];
      const credentials = credentialsRes.data ?? [];

      return providers.map((p: any) => ({
        ...p,
        activeModelsCount: models.filter((m: any) => m.provider_id === p.id && m.status === "active").length,
        last24hRequests: usage.filter((u: any) => u.provider_id === p.id).length,
        credentialStatus: credentials.find((c: any) => c.provider_id === p.id)?.status ?? "missing",
      }));
    },
  });
}

export function useProviderDetail(id: string) {
  return useQuery({
    queryKey: ["control", "provider", id],
    queryFn: async () => {
      const [providerRes, modelsRes, policiesRes, usageRes, credRes] = await Promise.all([
        supabase.from("providers").select("*").eq("id", id).single(),
        supabase.from("provider_models").select("*").eq("provider_id", id).order("display_name"),
        supabase.from("routing_policies").select("*").eq("preferred_provider_id", id).order("policy_name"),
        supabase.from("provider_usage_logs").select("*").eq("provider_id", id).order("created_at", { ascending: false }).limit(20),
        supabase.from("provider_credentials").select("*").eq("provider_id", id).limit(1),
      ]);
      if (providerRes.error) throw providerRes.error;

      // resolve model names for policies
      const allModelIds = [
        ...new Set([
          ...(policiesRes.data ?? []).map((p: any) => p.preferred_model_id),
          ...(policiesRes.data ?? []).filter((p: any) => p.fallback_model_id).map((p: any) => p.fallback_model_id),
          ...(usageRes.data ?? []).filter((u: any) => u.model_id).map((u: any) => u.model_id),
        ]),
      ];
      let modelMap: Record<string, string> = {};
      if (allModelIds.length > 0) {
        const mRes = await supabase.from("provider_models").select("id, display_name").in("id", allModelIds);
        for (const m of mRes.data ?? []) modelMap[m.id] = m.display_name;
      }

      return {
        provider: providerRes.data,
        models: modelsRes.data ?? [],
        routingPolicies: policiesRes.data ?? [],
        recentUsage: usageRes.data ?? [],
        credential: (credRes.data ?? [])[0] ?? null,
        modelMap,
      };
    },
    enabled: !!id,
  });
}

/* ═══════════════════════════════════════════════════════════
   useExecutionPolicy — resolves the current execution policy.

   Reads from system_settings.experimental_features JSON if
   available, otherwise returns a safe hardcoded default.

   This hook is read-only. Write support (policy switching)
   will be added when a settings UI is implemented.
   ═══════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import { useSystemMode } from "@/hooks/use-system-mode";
import { DEFAULT_POLICY } from "@/config/execution-engines";
import type {
  ExecutionPolicy,
  ExecutionEngine,
  ProviderFamily,
  OrchestrationMode,
  ExecutionPolicySettings,
} from "@/types/execution";

const VALID_ENGINES: ExecutionEngine[] = ["native", "ruflo"];
const VALID_PROVIDERS: ProviderFamily[] = ["anthropic", "openai", "google", "local"];
const VALID_MODES: OrchestrationMode[] = ["single", "swarm"];

function isEngine(v: unknown): v is ExecutionEngine {
  return typeof v === "string" && VALID_ENGINES.includes(v as ExecutionEngine);
}
function isProvider(v: unknown): v is ProviderFamily {
  return typeof v === "string" && VALID_PROVIDERS.includes(v as ProviderFamily);
}
function isMode(v: unknown): v is OrchestrationMode {
  return typeof v === "string" && VALID_MODES.includes(v as OrchestrationMode);
}

/**
 * Resolve an ExecutionPolicy from raw settings JSON.
 * Every field is validated; unknown values fall back to defaults.
 */
function resolvePolicy(raw: ExecutionPolicySettings | null | undefined): ExecutionPolicy {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_POLICY };

  const engine = isEngine(raw.execution_engine) ? raw.execution_engine : DEFAULT_POLICY.executionEngine;
  const provider = isProvider(raw.provider_family) ? raw.provider_family : DEFAULT_POLICY.providerFamily;
  const model = typeof raw.model_name === "string" && raw.model_name.length > 0
    ? raw.model_name
    : DEFAULT_POLICY.modelName;
  const mode = isMode(raw.orchestration_mode) ? raw.orchestration_mode : DEFAULT_POLICY.orchestrationMode;

  const fallbackProvider = raw.fallback_provider_family === null
    ? null
    : isProvider(raw.fallback_provider_family)
      ? raw.fallback_provider_family
      : DEFAULT_POLICY.fallbackProviderFamily;

  const fallbackModel = raw.fallback_model_name === null
    ? null
    : typeof raw.fallback_model_name === "string" && raw.fallback_model_name.length > 0
      ? raw.fallback_model_name
      : DEFAULT_POLICY.fallbackModelName;

  return {
    executionEngine: engine,
    providerFamily: provider,
    modelName: model,
    orchestrationMode: mode,
    fallbackProviderFamily: fallbackProvider,
    fallbackModelName: fallbackModel,
    experimental: engine !== "native",
  };
}

export function useExecutionPolicy(): {
  policy: ExecutionPolicy;
  isLoading: boolean;
  isRuflo: boolean;
  isExperimental: boolean;
  presetId: string;
} {
  const { data: settings, isLoading } = useSystemMode();

  const policy = useMemo(() => {
    const features = (settings as any)?.experimental_features as
      | ExecutionPolicySettings
      | null
      | undefined;
    return resolvePolicy(features);
  }, [settings]);

  const presetId = `${policy.executionEngine}-${policy.providerFamily === "anthropic" ? "claude" : policy.providerFamily === "openai" ? "gpt" : policy.providerFamily}`;

  return {
    policy,
    isLoading,
    isRuflo: policy.executionEngine === "ruflo",
    isExperimental: policy.experimental,
    presetId,
  };
}

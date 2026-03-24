/* ═══════════════════════════════════════════════════════════
   Execution Policy — typed model for execution engine and
   provider/model selection.

   This app is the canonical control plane. Execution engines
   (native or external like Ruflo) are delegated backends that
   do NOT own product state.

   See docs/integrations/01-ruflo-execution-engine.md
   ═══════════════════════════════════════════════════════════ */

/** Which engine executes the run */
export type ExecutionEngine = "native" | "ruflo";

/** Model provider family */
export type ProviderFamily = "anthropic" | "openai" | "google" | "local";

/** Single-agent or multi-agent orchestration */
export type OrchestrationMode = "single" | "swarm";

/** Full execution policy for a run or session */
export interface ExecutionPolicy {
  executionEngine: ExecutionEngine;
  providerFamily: ProviderFamily;
  modelName: string;
  orchestrationMode: OrchestrationMode;
  fallbackProviderFamily?: ProviderFamily | null;
  fallbackModelName?: string | null;
  /** Whether this configuration is considered experimental */
  experimental: boolean;
}

/** Metadata returned alongside a Ruflo-executed run */
export interface ExternalExecutionRef {
  externalTraceRef: string | null;
  externalSessionId: string | null;
}

/** Shape stored in system_settings.experimental_features JSON */
export interface ExecutionPolicySettings {
  execution_engine?: ExecutionEngine;
  provider_family?: ProviderFamily;
  model_name?: string;
  orchestration_mode?: OrchestrationMode;
  fallback_provider_family?: ProviderFamily | null;
  fallback_model_name?: string | null;
}

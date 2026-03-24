/* ═══════════════════════════════════════════════════════════
   External Run Trace — typed contract for execution telemetry
   that may come from native or external (Ruflo) engines.

   This type is frontend-only and does not require DB changes.
   When backend wiring is complete, run records will expose
   these fields via JSON metadata.

   See docs/integrations/01-ruflo-execution-engine.md
   ═══════════════════════════════════════════════════════════ */

import type { ExecutionEngine, ProviderFamily, OrchestrationMode } from "@/types/execution";

/** Trace metadata for a single run execution */
export interface ExternalRunTrace {
  executionEngine: ExecutionEngine;
  providerFamily: ProviderFamily;
  modelName: string;
  orchestrationMode: OrchestrationMode;
  /** Ruflo-side trace/run ID for cross-referencing */
  externalTraceRef?: string | null;
  /** Ruflo session ID (ephemeral) */
  externalSessionId?: string | null;
  /** Total tokens consumed during this run */
  tokenUsage?: number | null;
  /** Estimated cost in USD */
  estimatedCostUsd?: number | null;
}

/**
 * Attempt to extract an ExternalRunTrace from a run record's
 * JSON metadata field. Returns null if data is absent or invalid.
 */
export function parseRunTrace(raw: unknown): ExternalRunTrace | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const engine = obj.execution_engine;
  const provider = obj.provider_family;
  const model = obj.model_name;

  if (typeof engine !== "string" || typeof provider !== "string" || typeof model !== "string") {
    return null;
  }

  return {
    executionEngine: engine as ExecutionEngine,
    providerFamily: provider as ProviderFamily,
    modelName: model,
    orchestrationMode: (typeof obj.orchestration_mode === "string" ? obj.orchestration_mode : "single") as OrchestrationMode,
    externalTraceRef: typeof obj.external_trace_ref === "string" ? obj.external_trace_ref : null,
    externalSessionId: typeof obj.external_session_id === "string" ? obj.external_session_id : null,
    tokenUsage: typeof obj.token_usage === "number" ? obj.token_usage : null,
    estimatedCostUsd: typeof obj.estimated_cost_usd === "number" ? obj.estimated_cost_usd : null,
  };
}

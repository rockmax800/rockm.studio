/* ═══════════════════════════════════════════════════════════
   Native Engine Adapter — reflects the current built-in
   execution path where runs are processed by internal
   services (OrchestrationService, RunService, etc.).

   This adapter is always available and is the default.
   ═══════════════════════════════════════════════════════════ */

import type {
  ExecutionEngineAdapter,
  ExecutionRequest,
  ExecutionHandle,
  ExecutionStatus,
} from "@/lib/execution/types";

export const nativeEngine: ExecutionEngineAdapter = {
  id: "native",
  label: "Native",
  experimental: false,
  supportsSwarm: false,
  supportsProviders: ["anthropic", "openai", "google", "local"],

  async createExecution(request: ExecutionRequest): Promise<ExecutionHandle> {
    // In the current architecture, runs are created and dispatched
    // through RunService / OrchestrationService on the backend.
    // This stub represents that path for the adapter contract.
    //
    // TODO: When the backend API exposes a /runs/{id}/dispatch endpoint,
    // this adapter will call it and return the handle.

    console.info(
      `[native-engine] createExecution stub called for run ${request.runId}`,
    );

    return {
      ref: request.runId, // native uses the app's own run ID
      engine: "native",
      status: "pending",
    };
  },

  async getExecutionStatus(ref: string): Promise<ExecutionStatus> {
    // TODO: Poll the backend /runs/{ref}/status endpoint.
    // For now, returns a pending stub.

    console.info(`[native-engine] getExecutionStatus stub called for ${ref}`);

    return {
      ref,
      state: "pending",
      output: null,
      tokenUsage: null,
      estimatedCostUsd: null,
      externalTraceRef: null,
      externalSessionId: null,
    };
  },

  async cancelExecution(ref: string): Promise<void> {
    // TODO: Call backend /runs/{ref}/cancel endpoint.
    console.info(`[native-engine] cancelExecution stub called for ${ref}`);
  },
};

/* ═══════════════════════════════════════════════════════════
   Ruflo Engine Adapter — external experimental execution
   engine. Delegates work to Ruflo and maps results back
   into this app's run/artifact model.

   ⚠ EXPERIMENTAL — not yet wired to a backend dispatcher.
   Selecting Ruflo records the preference but does not
   currently route execution externally.

   If any code from the Ruflo repository is vendored or
   adapted into this file in the future, MIT attribution
   must be preserved per docs/integrations/01-ruflo-execution-engine.md §6.

   See docs/integrations/02-ruflo-adapter-contract.md
   ═══════════════════════════════════════════════════════════ */

import type {
  ExecutionEngineAdapter,
  ExecutionRequest,
  ExecutionHandle,
  ExecutionStatus,
} from "@/lib/execution/types";

export const rufloEngine: ExecutionEngineAdapter = {
  id: "ruflo",
  label: "Ruflo",
  experimental: true,
  supportsSwarm: true,
  supportsProviders: ["anthropic", "openai", "google"],

  async createExecution(request: ExecutionRequest): Promise<ExecutionHandle> {
    // ──────────────────────────────────────────────────────
    // TODO: Integration points (not yet implemented)
    //
    // Option A — HTTP API:
    //   POST {RUFLO_API_URL}/executions
    //   Body: { taskSpec, model, provider, contextRef, budget }
    //   Returns: { ref, status }
    //
    // Option B — CLI subprocess:
    //   spawn('ruflo', ['run', '--task', taskSpec, '--model', model])
    //   Parse stdout for ref and status
    //
    // Option C — MCP (Model Context Protocol):
    //   mcp.call('ruflo/execute', { ... })
    //   Await handle response
    //
    // All options must:
    //   1. Include this app's runId in the request so results
    //      can be mapped back.
    //   2. Not write to this app's database directly.
    //   3. Return a ref that can be used for polling.
    // ──────────────────────────────────────────────────────

    console.warn(
      `[ruflo-engine] createExecution called for run ${request.runId} — ` +
      `backend dispatch not yet implemented. Recording intent only.`,
    );

    // Return a placeholder handle. The ref is prefixed to
    // distinguish Ruflo refs from native run IDs.
    return {
      ref: `ruflo-${request.runId}-${Date.now()}`,
      engine: "ruflo",
      status: "pending",
    };
  },

  async getExecutionStatus(ref: string): Promise<ExecutionStatus> {
    // TODO: Poll Ruflo API / subprocess / MCP for status.
    //
    // When implemented, the response must be mapped to:
    //   - state: pending | running | completed | failed | cancelled
    //   - output: string content (maps to artifact content_text)
    //   - tokenUsage / estimatedCostUsd: telemetry
    //   - externalTraceRef: Ruflo-side trace ID
    //   - externalSessionId: Ruflo session ID (ephemeral)

    console.warn(
      `[ruflo-engine] getExecutionStatus called for ${ref} — ` +
      `backend polling not yet implemented.`,
    );

    return {
      ref,
      state: "pending",
      output: null,
      tokenUsage: null,
      estimatedCostUsd: null,
      externalTraceRef: null,
      externalSessionId: null,
      errorMessage: "Ruflo backend dispatch not yet connected on this branch.",
    };
  },

  async cancelExecution(ref: string): Promise<void> {
    // TODO: Send cancellation to Ruflo API / subprocess / MCP.
    console.warn(
      `[ruflo-engine] cancelExecution called for ${ref} — ` +
      `backend cancellation not yet implemented.`,
    );
  },
};

/* ═══════════════════════════════════════════════════════════
   Execution Engine — shared types for the adapter layer.

   These types define the contract that every execution engine
   (native or external) must satisfy. The app remains the
   canonical source of truth for all business entities.

   See docs/integrations/02-ruflo-adapter-contract.md
   ═══════════════════════════════════════════════════════════ */

import type { ExecutionEngine, ProviderFamily, OrchestrationMode } from "@/types/execution";

/* ── Request ─────────────────────────────────── */

/** Everything the engine needs to start work */
export interface ExecutionRequest {
  /** This app's run ID — the engine must reference it back */
  runId: string;
  /** This app's task ID */
  taskId: string;
  /** This app's project ID */
  projectId: string;
  /** What to do — role code + instruction */
  roleCode: string;
  instruction: string;
  /** Model routing hints */
  providerFamily: ProviderFamily;
  modelName: string;
  orchestrationMode: OrchestrationMode;
  /** Budget constraints */
  maxTokens?: number;
  maxCostUsd?: number;
  /** Optional context pack reference */
  contextPackId?: string | null;
}

/* ── Handle (returned on dispatch) ───────────── */

export interface ExecutionHandle {
  /** Engine-side unique reference */
  ref: string;
  /** Which engine accepted it */
  engine: ExecutionEngine;
  /** Initial status */
  status: ExecutionState;
}

/* ── Status (polled / pushed) ────────────────── */

export type ExecutionState =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface ExecutionStatus {
  ref: string;
  state: ExecutionState;
  /** Result content — maps to artifact content_text */
  output?: string | null;
  /** Structured output metadata */
  outputMeta?: Record<string, unknown> | null;
  /** Telemetry */
  tokenUsage?: number | null;
  estimatedCostUsd?: number | null;
  /** Engine-side trace ID for debugging */
  externalTraceRef?: string | null;
  /** Engine-side session ID (ephemeral) */
  externalSessionId?: string | null;
  /** Error message if failed */
  errorMessage?: string | null;
  /** When the engine started / finished */
  startedAt?: string | null;
  completedAt?: string | null;
}

/* ── Adapter interface ───────────────────────── */

export interface ExecutionEngineAdapter {
  /** Unique engine identifier */
  id: ExecutionEngine;
  /** Human-readable label */
  label: string;
  /** Whether this engine is experimental */
  experimental: boolean;
  /** Whether this engine supports multi-agent swarm mode */
  supportsSwarm: boolean;
  /** Which provider families this engine can route to */
  supportsProviders: ProviderFamily[];

  /**
   * Dispatch work to the engine.
   * Returns a handle immediately; actual work is async.
   */
  createExecution(request: ExecutionRequest): Promise<ExecutionHandle>;

  /**
   * Poll execution status.
   * In production this might be replaced by webhooks/callbacks.
   */
  getExecutionStatus(ref: string): Promise<ExecutionStatus>;

  /**
   * Request cancellation of an in-progress execution.
   */
  cancelExecution(ref: string): Promise<void>;
}

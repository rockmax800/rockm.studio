/* ═══════════════════════════════════════════════════════════
   Engine Registry — exposes available execution engines
   and resolves the active adapter from an ExecutionPolicy.

   This is the single point of access for engine selection.
   Business logic should never import adapters directly.

   See docs/integrations/02-ruflo-adapter-contract.md
   ═══════════════════════════════════════════════════════════ */

import type { ExecutionEngineAdapter } from "@/lib/execution/types";
import type { ExecutionEngine, ExecutionPolicy } from "@/types/execution";
import { nativeEngine } from "@/lib/execution/adapters/native-engine";
import { rufloEngine } from "@/lib/execution/adapters/ruflo-engine";

/* ── Registry ────────────────────────────────── */

const ENGINES: Record<ExecutionEngine, ExecutionEngineAdapter> = {
  native: nativeEngine,
  ruflo: rufloEngine,
};

/**
 * List all registered engines.
 */
export function listEngines(): ExecutionEngineAdapter[] {
  return Object.values(ENGINES);
}

/**
 * Get a specific engine adapter by ID.
 * Returns `native` as fallback if the requested engine is unknown.
 */
export function getEngine(id: ExecutionEngine): ExecutionEngineAdapter {
  return ENGINES[id] ?? ENGINES.native;
}

/**
 * Resolve the active engine adapter from an ExecutionPolicy.
 */
export function resolveEngine(policy: ExecutionPolicy): ExecutionEngineAdapter {
  return getEngine(policy.executionEngine);
}

/**
 * Check whether a specific engine is available and non-experimental.
 */
export function isEngineProduction(id: ExecutionEngine): boolean {
  const engine = ENGINES[id];
  return engine != null && !engine.experimental;
}

/**
 * List only production-ready (non-experimental) engines.
 */
export function listProductionEngines(): ExecutionEngineAdapter[] {
  return Object.values(ENGINES).filter((e) => !e.experimental);
}

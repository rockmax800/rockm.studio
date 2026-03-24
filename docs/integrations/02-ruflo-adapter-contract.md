---
doc_kind: integration-contract
load_strategy: auto
layer: delivery
criticality: high
version: v1.0
---

# Ruflo Adapter Contract

> **Status: Contract defined — adapter stubs implemented, backend not yet wired.**

---

## 1 — Purpose

This document defines the adapter boundary between this application (the
canonical control plane) and Ruflo (an optional external execution engine).

The adapter pattern ensures:

1. **Substitutability** — the app works identically with `native` or `ruflo` engine.
2. **Isolation** — Ruflo internals never leak into business logic.
3. **Traceability** — every external execution maps back to this app's run/artifact model.
4. **Honesty** — stubs clearly state what is and isn't implemented.

---

## 2 — Source of Truth Rule

| Domain | Owner |
|--------|-------|
| Projects, Tasks, Milestones | **This app** |
| Runs (lifecycle, state) | **This app** |
| Artifacts (content, versioning) | **This app** |
| Reviews, Approvals | **This app** |
| Deployments | **This app** |
| Work execution (model calls, file ops) | Delegated to engine adapter |
| Session management during execution | Engine adapter (ephemeral) |

> Ruflo **executes**. This app **decides, records, and governs**.

---

## 3 — Adapter Interface

Every execution engine must implement `ExecutionEngineAdapter`:

```typescript
interface ExecutionEngineAdapter {
  id: "native" | "ruflo";
  label: string;
  experimental: boolean;
  supportsSwarm: boolean;
  supportsProviders: ProviderFamily[];

  createExecution(request: ExecutionRequest): Promise<ExecutionHandle>;
  getExecutionStatus(ref: string): Promise<ExecutionStatus>;
  cancelExecution(ref: string): Promise<void>;
}
```

### ExecutionRequest

Contains everything the engine needs to perform work:

- Task specification (what to do)
- Model/provider preference
- Context pack reference
- Budget constraints (max tokens, max cost)
- Orchestration mode (single / swarm)

### ExecutionHandle

Returned immediately on dispatch:

- `ref` — unique execution reference (engine-side)
- `engine` — which adapter handled it
- `status` — initial status

### ExecutionStatus

Polled or pushed after execution:

- `ref` — execution reference
- `state` — pending / running / completed / failed / cancelled
- `output` — result content (maps to artifact)
- `tokenUsage` / `estimatedCostUsd` — telemetry
- `externalTraceRef` — engine-side trace ID

---

## 4 — Data Flow

```
  This App                          Engine Adapter
  ────────                          ──────────────
  Run created ──► createExecution() ──► engine starts work
                                        │
  Run polling ──► getExecutionStatus() ◄─┘
                                        │
  Run result  ◄── ExecutionStatus ──────┘
       │
       ├── Artifact created (content from output)
       ├── Review triggered (if configured)
       └── Run state updated (completed/failed)
```

### What the adapter returns

- Execution output (maps to artifact content)
- Token usage and cost telemetry
- Trace reference for debugging
- Final status

### What the adapter does NOT return

- Project state changes
- Approval decisions
- Review verdicts
- Deployment triggers

---

## 5 — Implementation Status

| Component | File | Status |
|-----------|------|--------|
| Adapter types | `src/lib/execution/types.ts` | ✅ Defined |
| Engine registry | `src/lib/execution/engine-registry.ts` | ✅ Implemented |
| Native adapter | `src/lib/execution/adapters/native-engine.ts` | ✅ Stub |
| Ruflo adapter | `src/lib/execution/adapters/ruflo-engine.ts` | ✅ Stub (not wired) |
| Backend dispatch | — | ❌ Not implemented |
| Callback/polling handler | — | ❌ Not implemented |
| UI integration | SystemPage Execution tab | ✅ Settings only |

---

## 6 — Rules

1. The adapter is **stateless** from this app's perspective — all state lives in
   this app's run/artifact tables.
2. Adapters must not write to this app's database directly.
3. All results flow through a controlled ingestion path (not yet built).
4. If an adapter fails, the run is marked `failed` — no silent fallback.
5. Adapter selection is determined by `ExecutionPolicy` (system default or
   session override).
6. MIT attribution must be preserved if any Ruflo code is vendored.

---

## 7 — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `docs/integrations/01-ruflo-execution-engine.md` | Architecture decision record |
| `docs/core/03-state-machine.md` | Run state machine unchanged |
| `docs/delivery/provider-architecture.md` | Adapters sit above provider routing |
| `src/types/execution.ts` | Frontend policy types |
| `src/types/external-run-trace.ts` | Trace telemetry types |

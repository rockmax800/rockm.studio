---
doc_kind: architecture-decision-record
load_strategy: auto
layer: delivery
criticality: high
version: v1.0
---

# Integration: Ruflo Execution Engine

> **Status: Experimental — not yet active on current branch.**
> This document defines the architectural boundary for integrating Ruflo
> as an optional external execution/orchestration engine.

---

## 1 — Boundary Rule

**This application is the canonical control plane.** Ruflo is an optional
execution engine that may perform work on behalf of the system, but it does
not own product state.

| Concern | Owner |
|---------|-------|
| Projects, Tasks, Runs, Artifacts | **This app** (source of truth) |
| Reviews, Approvals, Deployments | **This app** (source of truth) |
| Founder decisions and escalations | **This app** (source of truth) |
| Agent role contracts and scoring | **This app** (source of truth) |
| Work execution and model orchestration | Ruflo (delegated, traceable) |
| Session management during execution | Ruflo (ephemeral) |

> **Do not confuse the orchestration engine with the source of truth.**
> Ruflo executes. This app decides, records, and governs.

---

## 2 — Integration Parameters

When a run is dispatched, the following parameters define how execution is routed:

| Parameter | Values | Description |
|-----------|--------|-------------|
| `execution_engine` | `native` \| `ruflo` | Which engine executes the run |
| `provider_family` | `anthropic` \| `openai` \| `google` \| `local` | Model provider family |
| `orchestration_mode` | `single` \| `swarm` | Single-agent or multi-agent orchestration |
| `model_name` | string | Specific model identifier (e.g. `claude-sonnet-4-20250514`) |
| `external_trace_ref` | string \| null | Ruflo-side trace/run ID for cross-referencing |
| `external_session_id` | string \| null | Ruflo session ID (ephemeral, not stored as source of truth) |

These parameters are **metadata on the run entity** in this app. They do not
create new tables or change the existing schema.

---

## 3 — Data Flow

```
┌──────────────────────────┐
│  THIS APP (Control Plane)│
│                          │
│  Project → Task → Run ───┼──── dispatch ────┐
│                          │                  │
│  Run ← result + trace ───┼──── callback ────┤
│                          │                  │
│  Artifact ← evidence     │                  ▼
│  Review ← evaluation     │   ┌──────────────────────┐
│  Approval ← founder gate │   │  RUFLO (Exec Engine)  │
│  Deployment ← release    │   │                      │
│                          │   │  Model calls         │
└──────────────────────────┘   │  File operations     │
                               │  Session management  │
                               │  Trace logging       │
                               └──────────────────────┘
```

### What Ruflo returns

- Execution output (artifact content)
- Token usage and cost
- Trace reference for debugging
- Status (success / failure / partial)

### What Ruflo does NOT return

- Project state changes
- Approval decisions
- Review verdicts
- Deployment triggers

All of those remain in this app's domain.

---

## 4 — Current Implementation Status

| Capability | Status |
|-----------|--------|
| Integration document (this file) | ✅ Created |
| Schema fields for execution params | ❌ Not yet added (requires explicit schema task) |
| Ruflo dispatch service | ❌ Not implemented |
| Ruflo callback handler | ❌ Not implemented |
| UI trace visibility | ❌ Not implemented |
| Settings panel for engine selection | ❌ Not implemented |

> **Honesty note:** Until the dispatch service and callback handler are
> implemented, Ruflo integration exists only as a documented architecture
> decision. The UI should not present Ruflo as an active option.

---

## 5 — Rules

1. Ruflo is **optional**. The app must function fully with `execution_engine = native`.
2. Ruflo does not write directly to this app's database.
3. All Ruflo results are ingested through a controlled callback/polling mechanism.
4. `external_trace_ref` must be stored on the run for auditability.
5. Founder can see which engine executed each run.
6. No silent fallback — if Ruflo fails, the run is marked failed, not silently retried on native.
7. Ruflo integration is behind a feature flag (not enabled by default).

---

## 6 — Attribution

Ruflo is an external project. If any code or patterns are vendored from the
Ruflo repository, MIT attribution must be preserved and a third-party notice
added to the repository root.

---

## 7 — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `docs/00-runtime-truth.md` | This integration does not change the current runtime stack |
| `docs/delivery/provider-architecture.md` | Ruflo is a new provider routing target, not a replacement |
| `docs/core/03-state-machine.md` | Run state machine unchanged — Ruflo is an execution backend |
| `docs/delivery/backend-architecture.md` | Target architecture may include Ruflo as an execution plane |

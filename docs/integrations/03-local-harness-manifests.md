# 03 — Local Harness Manifests

> Status: **Active** · Owner: System layer · Last updated: 2025-01-20

## Purpose

This document describes the local manifest system for reusable hooks, rules, and commands. These manifests define the operational vocabulary of the product without depending on any external repository or runtime.

## Concepts

### Rule Manifest

A **rule** is a named constraint that the system enforces during transitions.

- **Hard enforcement**: blocks the transition (e.g. "no deploy without security check").
- **Soft enforcement**: warns but allows override with founder confirmation.

Rules are scoped to `system`, `project`, `role`, or `task`.

### Hook Manifest

A **hook** is a named trigger-action pair attached to a lifecycle event.

- Hooks fire at defined points: `before_release`, `on_run_start`, `on_risk_detected`, etc.
- Hooks do not self-modify — they execute a defined action summary.
- Some hooks require founder approval before activation.

### Command Manifest

A **command** is an explicit action that can be invoked by a founder, agent, or the system.

- Commands always have a defined `effect_summary`.
- Commands that cause state changes require `requires_confirmation: true`.
- Commands never bypass the project/task/review/approval state model.

## Scope Model

| Scope     | Meaning                                    |
|-----------|--------------------------------------------|
| `system`  | Applies globally across all projects       |
| `project` | Applies within one project lifecycle       |
| `role`    | Applies to a specific agent role           |
| `task`    | Applies to individual task execution       |

## Status Lifecycle

- `draft` — defined but not yet enforced.
- `active` — enforced in the current system state.
- `disabled` — explicitly turned off by the founder.

## Invariants

1. No manifest may cause self-modification without founder approval.
2. No manifest may bypass the canonical state model (project → task → run → artifact → review → approval).
3. All manifests are visible in the System Administration UI.
4. Manifests are local — no external repository dependency.

## Current Registry

See source files:

- `src/config/harness-rules.ts` — active rules
- `src/config/harness-hooks.ts` — active hooks
- `src/config/harness-commands.ts` — active commands
- `src/types/harness-manifest.ts` — type definitions

## Future Work

- Persist manifests to database when schema supports it.
- Allow founder to toggle individual manifests from the UI.
- Wire active hooks into the transition guard layer.
- Surface per-project rule applicability in the Project Guidance Pack.

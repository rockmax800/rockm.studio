---
layer: core
criticality: critical
enabled_in_production: yes
---

# 05 — Guard Matrix

> Layer 1 — Core Engine

## 1 — Purpose

Defines the strict transition guard rules for all lifecycle entities.
Guards are pure validation functions that check preconditions and return allow/deny.

**This is the single authoritative source for guard definitions.** No other layer may define new state transition guards.

**v2.1 Separation:** Guards operate on lifecycle_state only. Business outcomes (verdict, decision) are checked via context fields, never by inspecting lifecycle state.

---

## 2 — Guard Contract

```typescript
function guardTransition(
  entity: CurrentState,
  toState: TargetState,
  context: TransitionContext
): { allowed: true } | { allowed: false; reason: string }
```

Guards do NOT: modify state, emit events, call services, or access network.
Guards DO: validate current state, check preconditions, return explicit reasons.

**Guards NEVER infer lifecycle position from verdict/decision values.**

---

## 3 — Project Guards

| # | From → To | Required Conditions | Forbidden If |
|---|-----------|-------------------|-------------|
| P1 | draft → scoped | Brief exists and not empty | Brief missing |
| P2 | scoped → active | Required docs exist; founder approval (project_activation) | Docs missing; no approval |
| P3 | active → blocked | Blocker reason recorded | Blocker reason null |
| P4 | blocked → active | Blocker cleared | Blocker still active |
| P5 | active → in_review | Milestone artifacts exist (accepted/frozen) | No milestone artifacts |
| P6 | in_review → active | Founder rework decision recorded | No decision |
| P7 | in_review → completed | Founder approval; all tasks terminal | Non-terminal tasks exist |
| P8 | active → paused | Founder decision | — |
| P9 | paused → active | Founder decision | — |
| P10 | completed → archived | Founder decision | — |
| P11 | paused → archived | Founder decision | — |

---

## 4 — Task Guards

| # | From → To | Required Conditions | Forbidden If |
|---|-----------|-------------------|-------------|
| T1 | draft → ready | Title, goal, acceptance_criteria, requested_outcome, risk_class | Any missing |
| T2 | ready → assigned | owner_role_id selected; role active; handoff created | No active role; no handoff |
| T3 | assigned → in_progress | ContextPack exists | No ContextPack |
| T4 | in_progress → waiting_review | Artifact submitted | No output |
| T5 | in_progress → blocked | Blocker reason recorded | Reason null |
| T6 | in_progress → escalated | Escalation reason recorded | Reason null |
| T7 | waiting_review → **validated** | Review verdict ∈ {approved, approved_with_notes} | No review; verdict ≠ approved/approved_with_notes |
| T8 | waiting_review → rework_required | Review verdict = rejected | Verdict ≠ rejected |
| T9 | rework_required → assigned | Rework notes exist | Notes missing |
| T10 | blocked → assigned | Blocker cleared | Blocker active |
| T11 | escalated → assigned | Founder decision exists | No decision |
| T12 | **validated** → done | All reviews closed; no pending approvals | Unresolved reviews |
| T13 | **validated** → assigned | Next stage defined | No next stage |
| T14 | any non-terminal → cancelled | Actor=founder; cancellation reason | Not founder; no reason |

> **Note:** T7 checks `review.verdict ∈ {approved, approved_with_notes}`, not `review.state`. T8 checks `review.verdict == rejected`.
> **Follow-up:** When verdict = `approved_with_notes`, a follow-up task (requested_outcome=clarification) is auto-created in `ready` state. It does NOT auto-start.

---

## 5 — Run Guards

| # | From → To | Required Conditions | Forbidden If |
|---|-----------|-------------------|-------------|
| R1 | created → preparing | Task exists; agent role active | Missing |
| R2 | preparing → running | Context pack available | Missing |
| R3 | preparing → failed | Failure reason recorded | Reason null |
| R4 | running → produced_output | At least one artifact exists | No output |
| R5 | running → failed | Failure reason recorded | Reason null |
| R6 | running → timed_out | Timeout recorded | No event |
| R7 | running → cancelled | Cancellation recorded | No reason |
| R8 | produced_output → finalized | Artifact linkage complete | Incomplete |
| R9-R11 | terminal_cause → finalized | Classification exists | Missing |
| R12-R14 | various → superseded | Replacement run recorded | No replacement |

---

## 6 — Artifact Guards

| # | From → To | Required Conditions | Forbidden If |
|---|-----------|-------------------|-------------|
| A1 | created → classified | Source task/run exists | Both null |
| A2 | classified → submitted | Target review/consumer exists | No target |
| A3 | submitted → under_review | Review record exists | No review |
| A4 | under_review → accepted | Review verdict = approved (terminal) | Review verdict non-terminal |
| A5 | under_review → rejected | Review verdict = rejected | Verdict ≠ rejected |
| A6 | accepted → frozen | Freeze reason recorded | No reason |
| A7-A8 | accepted/rejected → superseded | Replacement artifact linked | No replacement |
| A9-A10 | frozen/accepted → archived | Archival reason recorded | No reason |

> **Note:** A4/A5 check `review.verdict`, not `review.state`.

---

## 7 — Review Guards (Lifecycle Only)

| # | From → To | Required Conditions | Forbidden If |
|---|-----------|-------------------|-------------|
| V1 | created → in_progress | Target artifact exists | Missing |
| V2 | in_progress → needs_clarification | Issue recorded | No issue |
| V3 | needs_clarification → in_progress | Clarification linked | Missing |
| V4 | in_progress → **resolved** | Verdict set (approved/approved_with_notes/rejected/escalated) | No verdict |
| V5 | **resolved** → closed | Finalization recorded | — |

> **Removed:** Old guards V4–V8 that tested `review.state == approved|rejected|escalated`. These are now `review.verdict` checks, not lifecycle transitions.

---

## 8 — Approval Guards (Lifecycle Only)

| # | From → To | Required Conditions | Forbidden If |
|---|-----------|-------------------|-------------|
| G1 | pending → **decided** | Actor=founder; decision set (approved/rejected/deferred); decision note | Not founder |
| G2 | pending → expired | Expiration reason | — |
| G3 | **decided** → closed | Linked action exists | — |
| G4 | expired → closed | — | — |

> **Removed:** Old guards G1–G3 that tested `approval.state == approved|rejected|deferred`. These are now `approval.decision` checks, not lifecycle transitions.

---

## 9 — Orchestration Requirements

Transitions that MUST go through OrchestrationService (not direct CRUD):
- P2, P5, P6, P7 (Project)
- T2, T3, T4, T7, T8, T9, T10, T11, T12, T13 (Task)
- R1, R2, R4, R8-R14 (Run)
- V4 (Review → resolved, must set verdict atomically)
- G1 (Approval → decided, must set decision atomically)
- All multi-entity cascades

---

## 10 — Forbidden Patterns

1. ❌ `if (review.state === 'approved')` — use `review.verdict === 'approved'`
2. ❌ `if (approval.state === 'approved')` — use `approval.decision === 'approved'`
3. ❌ `if (task.state === 'approved')` — use `task.state === 'validated'`
4. ❌ Inferring lifecycle position from verdict/decision values
5. ❌ Setting verdict/decision without transitioning lifecycle state

---
layer: core
criticality: critical
enabled_in_production: yes
---

# 03 — State Machine

> Layer 1 — Core Engine

## 1 — Purpose

Defines lifecycle states, transitions, triggers, and guards for the six core entities:
Project, Task, Run, Artifact, Review, Approval.

These entities are distinct and must not be merged conceptually.
**This is the single authoritative source for all state definitions.** No other layer may redefine states or transitions.

---

## 2 — Lifecycle Principles

1. A Project contains many Tasks
2. A Task may have multiple Runs (failed run ≠ dead task)
3. An Artifact is not approved by default — needs review
4. A Review is a formal object with a verdict, not a comment
5. Approval authorizes the next step; Review validates quality
6. Terminal states must be explicit
7. **Lifecycle state and business outcome (verdict/decision) are separate concerns**

---

## 2.1 — Lifecycle vs Outcome Separation

Three entities have been refactored to separate process state from business decision:

| Entity | Lifecycle Field | Outcome Field | Rationale |
|--------|----------------|---------------|-----------|
| Review | `state` (lifecycle) | `verdict` | Reviewer's judgment is outcome, not process position |
| Approval | `state` (lifecycle) | `decision` | Founder's decision is outcome, not process position |
| Task | `state` (lifecycle) | — | `validated` replaces old `approved` to avoid collision with Approval entity |

**Guards must never infer lifecycle position from verdict/decision values.**

---

## 3 — Project States

See `01-project-lifecycle.md` for full project state machine.

---

## 4 — Task State Machine

### 4.1 States

| State | Meaning |
|-------|---------|
| draft | Task being written or refined |
| ready | Task is clear enough to assign |
| assigned | Task has an owner role |
| in_progress | Active execution underway |
| waiting_review | Output exists, awaiting review |
| rework_required | Review rejected, changes requested |
| blocked | Cannot proceed |
| escalated | Founder decision needed |
| **validated** | Task output accepted by review (was: `approved`) |
| done | No further work needed |
| cancelled | Dropped intentionally |

> **Migration note:** `approved` → `validated`. The term "validated" avoids semantic collision with the Approval entity. A task in `validated` means review passed, not that an Approval was granted.

### 4.2 Transitions

| From | To | Trigger | Guard |
|------|----|---------|-------|
| draft | ready | Spec complete | Title, goal, acceptance_criteria, requested_outcome, risk_class exist |
| ready | assigned | Owner selected | owner_role_id set; role active; handoff created |
| assigned | in_progress | Run starts | Context available |
| in_progress | waiting_review | Artifact submitted | Output exists |
| in_progress | blocked | Dependency failure | Blocker recorded |
| in_progress | escalated | Ambiguity/risk found | Escalation reason recorded |
| waiting_review | **validated** | Reviewer accepts | Review verdict ∈ {approved, approved_with_notes} |
| waiting_review | rework_required | Reviewer rejects | Review verdict = rejected |
| rework_required | assigned | Task returned | Rework notes exist |
| blocked | assigned | Blocker resolved | Blocker cleared |
| escalated | assigned | Founder decides | Decision recorded |
| **validated** | done | No further approval needed | Downstream complete |
| **validated** | assigned | Follow-up needed | Next stage defined |
| any non-terminal | cancelled | Founder cancels | Cancellation reason; actor=founder |

### 4.3 Terminal States: `done`, `cancelled`

For guard details, see `05-guard-matrix.md`.

---

## 5 — Run State Machine

### 5.1 States

| State | Meaning |
|-------|---------|
| created | Record exists, not started |
| preparing | Context and tools being prepared |
| running | Execution active |
| produced_output | Finished, artifacts produced |
| failed | Ended unsuccessfully |
| timed_out | Exceeded runtime |
| cancelled | Stopped intentionally |
| superseded | Replaced by newer run |
| finalized | Outcome recorded, no further action |

### 5.2 Transitions

| From | To | Trigger | Guard |
|------|----|---------|-------|
| created | preparing | Setup starts | Task and agent exist |
| preparing | running | Setup completed | Context pack available |
| preparing | failed | Setup failure | Failure reason recorded |
| running | produced_output | Outputs generated | At least one output exists |
| running | failed | Execution error | Failure reason recorded |
| running | timed_out | Runtime exceeded | Timeout recorded |
| running | cancelled | Manual stop | Cancellation recorded |
| produced_output | finalized | Outputs stored | Artifact linkage complete |
| failed | finalized | Failure logged | Classification exists |
| timed_out | finalized | Timeout logged | Classification exists |
| cancelled | finalized | Logged | — |
| created | superseded | Newer run created | Replacement recorded |
| preparing | superseded | Newer run replaces | Replacement recorded |
| failed | superseded | Retry launched | Newer run linked |

### 5.3 Terminal States: `finalized`, `superseded`

---

## 6 — Artifact State Machine

### 6.1 States

| State | Meaning |
|-------|---------|
| created | Exists, not classified |
| classified | Type and source known |
| submitted | Sent for review |
| under_review | Being evaluated |
| accepted | Passed validation |
| rejected | Failed validation |
| superseded | Replaced by newer version |
| frozen | Locked as canonical |
| archived | Retained but inactive |

### 6.2 Terminal States: `archived`

---

## 7 — Review State Machine (Lifecycle + Verdict)

### 7.1 Lifecycle States

| State | Meaning |
|-------|---------|
| created | Requested, not started |
| in_progress | Actively evaluating |
| needs_clarification | Missing context |
| **resolved** | Verdict has been set |
| closed | Complete |

### 7.2 Verdict (separate field, set when lifecycle → resolved)

| Verdict | Meaning |
|---------|---------|
| null | No decision yet |
| approved | Output accepted |
| approved_with_notes | Accepted with remarks |
| rejected | Failed validation |
| escalated | Founder decision required |

### 7.3 Transitions

| From | To | Trigger | Guard |
|------|----|---------|-------|
| created | in_progress | Evaluation starts | Target artifact exists |
| in_progress | needs_clarification | Missing info | Issue recorded |
| needs_clarification | in_progress | Info received | Clarification linked |
| in_progress | **resolved** | Reviewer decides | Verdict must be set |
| **resolved** | closed | Finalization | — |

### 7.4 Terminal States: `closed`

> **Key invariant:** `verdict` is only set when transitioning to `resolved`. Guards check `review.verdict` for business logic, `review.state` for lifecycle position.

---

## 8 — Approval State Machine (Lifecycle + Decision)

### 8.1 Lifecycle States

| State | Meaning |
|-------|---------|
| pending | Requested, not decided |
| **decided** | Founder has made a decision |
| expired | No longer valid |
| closed | Lifecycle completed |

### 8.2 Decision (separate field, set when lifecycle → decided)

| Decision | Meaning |
|----------|---------|
| null | No decision yet |
| approved | Accepted |
| rejected | Denied |
| deferred | Postponed |

### 8.3 Transitions

| From | To | Trigger | Guard |
|------|----|---------|-------|
| pending | **decided** | Founder decides | Decision must be set |
| pending | expired | Timeout | Expiration reason required |
| **decided** | closed | Workflow consumed | Linked action exists |
| expired | closed | Finalized | — |

### 8.4 Terminal States: `closed`

> **Key invariant:** `decision` is only set when transitioning to `decided`. Guards check `approval.decision` for business logic, `approval.state` for lifecycle position.

---

## 9 — Cross-Entity Invariants

1. Every task has exactly one current lifecycle state
2. Every run has exactly one parent task
3. Every artifact has a source task or run
4. Every review ends in a closed state
5. A task in `done` cannot have unresolved blocking review
6. A project in `completed` cannot have active critical tasks
7. An approval in `pending` must have a known approver
8. A run in `running` must have started from `preparing`
9. A rejected artifact cannot become canonical without replacement
10. A closed project can only change through explicit reopen
11. **Review verdict is null until lifecycle reaches `resolved`**
12. **Approval decision is null until lifecycle reaches `decided`**
13. **Task `validated` ≠ Approval `decided` with decision=approved — these are distinct concepts**
14. **Every task owner change must create a Handoff record**
15. **No run may start without an acknowledged Handoff on the task**
16. **Every Handoff must have `requested_outcome` and `acceptance_criteria`**

---

## 10 — Failure and Rework Loops

### Run failure loop
`failed`/`timed_out` → finalize → task remains active/blocked → retry, reassign, or escalate

### Review rejection loop
Artifact under review → review resolved (verdict=rejected) → task `rework_required` → **rework Handoff created** (reviewer → implementer) → reassigned → new run → new review

### Founder escalation loop
Task/review escalated → founder decision → reassign, pause, change, or cancel

---

## 11 — Handoff State Machine

### 11.1 States

| Status | Meaning |
|--------|---------|
| created | Handoff record exists, target not yet acknowledged |
| acknowledged | Target role accepted the handoff |
| completed | Work finished successfully |
| cancelled | Handoff cancelled (task reassigned, cancelled, etc.) |

### 11.2 Transitions

| From | To | Trigger | Guard |
|------|----|---------|-------|
| created | acknowledged | Target role accepts | Actor = target_role_id |
| acknowledged | completed | Work done | Actor = target_role_id or system |
| created | cancelled | Task cancelled/reassigned | — |
| acknowledged | cancelled | Task cancelled/reassigned | — |

### 11.3 Terminal States: `completed`, `cancelled`

### 11.4 Handoff Lifecycle Invariants

1. A handoff is created when `task.owner_role_id` changes (via UC-02 assignTask)
2. A rework handoff is created when review verdict = rejected (reviewer → implementer)
3. `task.current_handoff_id` always points to the most recent active handoff
4. A run cannot start unless `task.current_handoff_id` references an `acknowledged` handoff
5. Multiple handoffs per task are allowed (history preserved)
6. Only the target role may acknowledge a handoff

### 11.5 Required Fields

| Field | Required |
|-------|----------|
| requested_outcome | **Yes** — implementation, review, clarification, approval_prep, qa, release |
| acceptance_criteria_json | **Yes** — at least one criterion |
| source_role_id | **Yes** |
| target_role_id | **Yes** |

---

## 12 — Migration Mapping

| Entity | Old State | New Lifecycle State | New Outcome Field |
|--------|-----------|--------------------|--------------------|
| Review | approved | resolved | verdict = approved |
| Review | approved_with_notes | resolved | verdict = approved_with_notes |
| Review | rejected | resolved | verdict = rejected |
| Review | escalated | resolved | verdict = escalated |
| Approval | approved | decided | decision = approved |
| Approval | rejected | decided | decision = rejected |
| Approval | deferred | decided | decision = deferred |
| Task | approved | validated | — |

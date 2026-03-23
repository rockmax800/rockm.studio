# 03 — State Machine

> Layer 1 — Core Engine

## 1 — Purpose

Defines lifecycle states, transitions, triggers, and guards for the six core entities:
Project, Task, Run, Artifact, Review, Approval.

These entities are distinct and must not be merged conceptually.

---

## 2 — Lifecycle Principles

1. A Project contains many Tasks
2. A Task may have multiple Runs (failed run ≠ dead task)
3. An Artifact is not approved by default — needs review
4. A Review is a formal object with a verdict, not a comment
5. Approval authorizes the next step; Review validates quality
6. Terminal states must be explicit

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
| approved | Task output accepted |
| done | No further work needed |
| cancelled | Dropped intentionally |

### 4.2 Transitions

| From | To | Trigger | Guard |
|------|----|---------|-------|
| draft | ready | Task clarified | Acceptance criteria exist |
| ready | assigned | Owner selected | Eligible active role exists |
| assigned | in_progress | Run starts | Context available |
| in_progress | waiting_review | Artifact submitted | Output exists |
| in_progress | blocked | Dependency failure | Blocker recorded |
| in_progress | escalated | Ambiguity/risk found | Escalation reason recorded |
| waiting_review | approved | Reviewer accepts | Review verdict approved |
| waiting_review | rework_required | Reviewer rejects | Review verdict rejected |
| rework_required | assigned | Task returned | Rework notes exist |
| blocked | assigned | Blocker resolved | Blocker cleared |
| escalated | assigned | Founder decides | Decision recorded |
| approved | done | No further approval needed | Downstream complete |
| approved | assigned | Follow-up needed | Next stage defined |
| any non-terminal | cancelled | Founder cancels | Cancellation reason; actor=founder |

### 4.3 Terminal States: `done`, `cancelled`

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

## 7 — Review State Machine

### 7.1 States

| State | Meaning |
|-------|---------|
| created | Requested, not started |
| in_progress | Actively evaluating |
| needs_clarification | Missing context |
| approved | Output accepted |
| approved_with_notes | Accepted with remarks |
| rejected | Failed validation |
| escalated | Founder decision required |
| closed | Complete |

### 7.2 Terminal States: `closed`

---

## 8 — Approval State Machine

### 8.1 States

| State | Meaning |
|-------|---------|
| pending | Requested, not decided |
| approved | Accepted |
| rejected | Denied |
| deferred | Postponed |
| expired | No longer valid |
| closed | Lifecycle completed |

### 8.2 Terminal States: `closed`

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

---

## 10 — Failure and Rework Loops

### Run failure loop
`failed`/`timed_out` → finalize → task remains active/blocked → retry, reassign, or escalate

### Review rejection loop
Artifact under review → rejected → task `rework_required` → reassigned → new run → new review

### Founder escalation loop
Task/review escalated → founder decision → reassign, pause, change, or cancel

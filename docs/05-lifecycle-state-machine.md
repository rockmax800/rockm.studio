# 05 — Lifecycle State Machine

## 1 — Purpose

This document defines the lifecycle states, transitions, triggers, and guards for the core entities of AI Workshop OS.

The goal is to make the system operationally clear:
- what can exist
- in what state it currently is
- who can move it forward
- when it must stop
- when it must return for rework
- when founder approval is required

This document prevents:
- hidden workflow drift
- ambiguous ownership
- stuck tasks with no escalation path
- silent acceptance of low-quality outputs
- confusion between work planning and execution

---

## 2 — Core Lifecycle Entities

This version defines state machines for:
- Project
- Task
- Run
- Artifact
- Review
- Approval

These entities are distinct and must not be merged conceptually.

---

## 3 — Lifecycle Principles

### 3.1 A Project contains many Tasks
A project is the container for delivery work.

### 3.2 A Task may have multiple Runs
A failed run does not mean the task is dead.
It means one execution attempt failed.

### 3.3 An Artifact is not approved by default
Artifacts are outputs.
They need review or founder decision depending on type.

### 3.4 Review is a separate lifecycle
Review is not a comment.
It is a formal object with a verdict.

### 3.5 Approval is not the same as review
Review validates quality and correctness.
Approval authorizes the next step.

### 3.6 Terminal states must be explicit
Every entity must clearly indicate whether it is active, blocked, rejected, completed, or archived.

---

## 4 — Project State Machine

## 4.1 States

| State | Meaning |
|---|---|
| draft | project idea exists but is not ready for execution |
| scoped | project brief and initial scope are defined |
| active | project is open for task creation and delivery work |
| blocked | project cannot move due to unresolved issue |
| in_review | major milestone or release candidate is under founder review |
| paused | project is intentionally stopped |
| completed | project goals for current version are met |
| archived | project is frozen and no further work is expected |

## 4.2 Allowed Transitions

| From | To | Trigger | Guard |
|---|---|---|---|
| draft | scoped | brief accepted | minimum project brief exists |
| scoped | active | founder starts execution | required V1 docs exist |
| active | blocked | blocker raised | blocker recorded |
| blocked | active | blocker resolved | blocking issue cleared |
| active | in_review | release candidate submitted | milestone artifacts exist |
| in_review | active | founder requests more work | rework required |
| in_review | completed | founder approves milestone or release | acceptance criteria met |
| active | paused | founder pauses work | none |
| paused | active | founder resumes work | none |
| completed | archived | founder archives project | none |
| paused | archived | founder archives abandoned work | none |

## 4.3 Terminal States
- archived

## 4.4 Notes
A completed project may still create future projects or versions, but its own lifecycle is closed unless explicitly reopened.

---

## 5 — Task State Machine

## 5.1 Task Purpose
A task is a scoped unit of work assigned to one role or one domain at a time.

Examples:
- define auth API contract
- design DB schema for billing stub
- build dashboard overview screen
- review migration plan
- create test cases for user permissions

## 5.2 States

| State | Meaning |
|---|---|
| draft | task is being written or refined |
| ready | task is clear enough to assign |
| assigned | task has an owner role |
| in_progress | active execution is underway |
| waiting_review | output exists and awaits review |
| rework_required | review rejected or requested changes |
| blocked | task cannot proceed |
| escalated | founder decision is needed |
| approved | task output is accepted |
| done | no further work needed for this task |
| cancelled | task was dropped intentionally |

## 5.3 Allowed Transitions

| From | To | Trigger | Guard |
|---|---|---|---|
| draft | ready | task clarified | acceptance criteria exist |
| ready | assigned | owner selected | eligible role exists |
| assigned | in_progress | run starts or owner begins work | context available |
| in_progress | waiting_review | artifact submitted | output exists |
| in_progress | blocked | dependency or failure stops work | blocker recorded |
| in_progress | escalated | ambiguity or material risk found | escalation reason recorded |
| waiting_review | approved | reviewer accepts output | review verdict approved |
| waiting_review | rework_required | reviewer rejects or requests changes | review verdict not approved |
| rework_required | assigned | task returned to owner | rework notes exist |
| blocked | assigned | blocker resolved and owner restored | blocker cleared |
| escalated | assigned | founder decides next path | decision recorded |
| approved | done | no further approval needed | downstream handoff complete or none needed |
| approved | assigned | follow-up implementation or integration needed | next stage task defined |
| any non-terminal | cancelled | founder cancels task | cancellation reason recorded |

## 5.4 Terminal States
- done
- cancelled

## 5.5 Task Guards
A task must not move to `ready` unless it includes:
- task title
- purpose
- owner role
- acceptance criteria
- expected artifact type

A task must not move to `done` unless:
- review state is resolved
- required approvals are completed
- next-step ambiguity is closed

---

## 6 — Run State Machine

## 6.1 Run Purpose
A run is one isolated execution attempt by one agent against one task.

## 6.2 States

| State | Meaning |
|---|---|
| created | run record exists but has not started |
| preparing | context, workspace, and tools are being prepared |
| running | execution is active |
| produced_output | run finished and produced one or more artifacts |
| failed | run ended unsuccessfully |
| timed_out | run exceeded allowed runtime |
| cancelled | run was stopped intentionally |
| superseded | a newer run replaced this run |
| finalized | run outcome recorded and no further action is expected |

## 6.3 Allowed Transitions

| From | To | Trigger | Guard |
|---|---|---|---|
| created | preparing | orchestrator starts setup | task and agent exist |
| preparing | running | setup completed | context pack available |
| preparing | failed | setup failure | failure reason recorded |
| running | produced_output | outputs generated successfully | at least one output exists |
| running | failed | execution error | failure reason recorded |
| running | timed_out | runtime limit exceeded | timeout event recorded |
| running | cancelled | manual stop | cancellation recorded |
| produced_output | finalized | outputs stored and linked | artifact linkage complete |
| failed | finalized | failure logged | failure classification exists |
| timed_out | finalized | timeout logged | timeout classification exists |
| cancelled | finalized | cancellation logged | none |
| created | superseded | newer run created before start | replacement recorded |
| preparing | superseded | newer run replaces this setup | replacement recorded |
| failed | superseded | retry launched | newer run linked |

## 6.4 Terminal States
- finalized
- superseded

## 6.5 Notes
A run can fail while the task remains active.
This distinction is mandatory.

---

## 7 — Artifact State Machine

## 7.1 Artifact Purpose
An artifact is any meaningful output produced by a task or run.

Examples:
- markdown document
- UI spec
- code diff
- migration file
- test report
- review report
- release note

## 7.2 States

| State | Meaning |
|---|---|
| created | artifact exists but has not been classified |
| classified | artifact type and source are known |
| submitted | artifact has been sent for review or handoff |
| under_review | artifact is being evaluated |
| accepted | artifact passed required validation |
| rejected | artifact failed validation |
| superseded | newer artifact version replaced it |
| frozen | artifact is locked as canonical or milestone output |
| archived | artifact is retained but no longer active |

## 7.3 Allowed Transitions

| From | To | Trigger | Guard |
|---|---|---|---|
| created | classified | metadata attached | source task or run exists |
| classified | submitted | artifact handed off | target review or consumer exists |
| submitted | under_review | reviewer starts evaluation | review record exists |
| under_review | accepted | review passes | positive verdict exists |
| under_review | rejected | review fails | rejection reason exists |
| accepted | frozen | founder or system locks canonical output | freeze reason recorded |
| accepted | superseded | newer approved version replaces artifact | replacement linked |
| rejected | superseded | corrected artifact replaces rejected output | replacement linked |
| frozen | archived | project or version closed | archival reason recorded |
| accepted | archived | non-canonical artifact is retired | archival reason recorded |

## 7.4 Terminal States
- archived

## 7.5 Notes
Only selected artifacts become frozen canonical references.
Most artifacts remain accepted but not canonical.

---

## 8 — Review State Machine

## 8.1 Review Purpose
A review is a formal validation of an artifact or task output.

## 8.2 States

| State | Meaning |
|---|---|
| created | review requested but not started |
| in_progress | reviewer is actively evaluating |
| needs_clarification | reviewer cannot evaluate due to missing context |
| approved | output is accepted |
| approved_with_notes | output is accepted with non-blocking remarks |
| rejected | output failed validation |
| escalated | founder decision required |
| closed | review process is complete |

## 8.3 Allowed Transitions

| From | To | Trigger | Guard |
|---|---|---|---|
| created | in_progress | reviewer starts work | target artifact exists |
| in_progress | needs_clarification | context missing | issue recorded |
| needs_clarification | in_progress | context supplied | clarification linked |
| in_progress | approved | validation passed | no blocking issue |
| in_progress | approved_with_notes | validation passed with minor issues | non-blocking notes recorded |
| in_progress | rejected | blocking issue found | rejection reason recorded |
| in_progress | escalated | founder decision needed | escalation reason recorded |
| approved | closed | review finalized | none |
| approved_with_notes | closed | review finalized | none |
| rejected | closed | rejection finalized | rework path recorded |
| escalated | closed | founder decision recorded | decision linked |

## 8.4 Terminal States
- closed

## 8.5 Review Rules
A review must reference:
- target artifact or task
- reviewer role
- verdict
- reason
- blocking vs non-blocking status

---

## 9 — Approval State Machine

## 9.1 Approval Purpose
Approval captures an explicit founder or authorized gate decision.

## 9.2 States

| State | Meaning |
|---|---|
| pending | approval requested but not decided |
| approved | request accepted |
| rejected | request denied |
| deferred | decision postponed |
| expired | approval request no longer valid |
| closed | approval lifecycle completed |

## 9.3 Allowed Transitions

| From | To | Trigger | Guard |
|---|---|---|---|
| pending | approved | approver accepts | decision recorded |
| pending | rejected | approver denies | reason recorded |
| pending | deferred | approver postpones | follow-up note recorded |
| pending | expired | request becomes obsolete | expiration reason recorded |
| approved | closed | decision consumed by workflow | linked action exists |
| rejected | closed | decision consumed by workflow | linked action exists |
| deferred | closed | replaced by new approval request | replacement linked |
| expired | closed | finalization | none |

## 9.4 Terminal States
- closed

## 9.5 Approval Required For
In V1, approval is required for:
- activation of a project
- major architecture decisions
- database schema changes
- release candidate acceptance
- cancellation of major in-progress work

---

## 10 — Cross-Entity Lifecycle Relationships

| Source Entity | Rule |
|---|---|
| Project | cannot move to `active` unless minimum required docs exist |
| Task | cannot move to `in_progress` without owner and context |
| Task | cannot move to `done` if required review is unresolved |
| Run | must belong to exactly one task |
| Artifact | must reference a source task or run |
| Review | must reference one target artifact or task output |
| Approval | must reference a decision object, milestone, or gated action |

---

## 11 — Required Docs Before State Changes

## 11.1 Before Project moves to `active`
Must exist:
- `00-project-brief.md`
- `04-domain-boundaries.md`
- `05-lifecycle-state-machine.md`

## 11.2 Before backend Task moves to `ready`
Must exist or be defined enough:
- relevant project brief section
- domain placement
- expected artifact
- acceptance criteria

## 11.3 Before schema-related Task moves to `in_progress`
Must exist:
- explicit schema task
- impact note
- founder approval request if material

## 11.4 Before release-related Task moves to `done`
Must exist:
- accepted artifacts
- review closure
- release approval if required

---

## 12 — Failure and Rework Loops

### 12.1 Run failure loop
`failed` or `timed_out` run
→ finalize run
→ task remains active or becomes blocked
→ orchestrator decides retry, reassign, or escalate

### 12.2 Review rejection loop
artifact under review
→ review rejected
→ task moves to `rework_required`
→ task is reassigned
→ new run produces revised artifact
→ new review begins

### 12.3 Founder escalation loop
task or review escalated
→ founder decision
→ task reassigned, paused, changed, or cancelled

---

## 13 — Anti-Patterns This Lifecycle Prevents

1. treating "agent answered" as "task done"
2. treating "one run failed" as "the whole project failed"
3. accepting generated code without review
4. allowing reviews without explicit verdicts
5. mixing approval with implementation
6. losing track of why something was rejected
7. shipping artifacts with unresolved lifecycle state

---

## 14 — State Invariants

The following must always be true:

1. every task has exactly one current lifecycle state
2. every run has exactly one parent task
3. every artifact has a source task or source run
4. every review ends in a closed state
5. a task in `done` cannot have unresolved blocking review
6. a project in `completed` cannot have active critical tasks
7. an approval in `pending` must have a known approver
8. a run in `running` must have started from `preparing`
9. a rejected artifact must not become canonical without replacement or override decision
10. a closed project can only be changed through explicit reopen or new version workflow

---

## 15 — Open Questions for Next Documents

These will be refined later:
- exact retry policy by task type
- exact timeouts by run type
- exact review SLA by artifact type
- exact founder approval UI
- exact severity model for blockers
- exact canonical artifact freezing rules

---

## 16 — Initial Workflow Summary

The intended V1 working pattern is:

1. Founder creates or scopes a project
2. Project becomes active
3. Tasks are created and assigned
4. Runs execute task work
5. Artifacts are produced
6. Reviews validate outputs
7. Rework happens if needed
8. Founder approves major decisions
9. Accepted tasks move to done
10. Project reaches milestone review or completion
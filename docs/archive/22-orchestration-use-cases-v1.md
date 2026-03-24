# 22 — Orchestration Use Cases V1

## 1 — Purpose

This document defines the complete list of orchestration use cases for the AI Workshop OS Application Layer.

Sources:
- `docs/21-lifecycle-transition-guards-v1.md`
- `docs/14-data-model-v1.md`
- `docs/12-ai-collaboration-protocol.md`
- `docs/15-backend-architecture-v1.md`
- `docs/18-model-provider-architecture-v1.md`

Each use case is an atomic workflow action that coordinates one or more entity state transitions, enforces guards, emits events, and handles failures.

---

## 2 — Use Case Index

| # | Use Case | Sync/Async | Founder? | Provider? |
|---|---|---|---|---|
| UC-01 | Activate Project | sync | **yes** | no |
| UC-02 | Assign Task | sync | no | no |
| UC-03 | Start Run | async | no | no |
| UC-04 | Complete Run | async | no | no |
| UC-05 | Submit Artifact for Review | sync | no | no |
| UC-06 | Resolve Review — Approve | sync | no | no |
| UC-07 | Resolve Review — Reject (Rework Loop) | sync | no | no |
| UC-08 | Resolve Review — Escalate | sync | no | no |
| UC-09 | Request Approval | sync | no | no |
| UC-10 | Resolve Approval | sync | **yes** | no |
| UC-11 | Complete Task | sync | no | no |
| UC-12 | Complete Project Milestone | sync | **yes** | no |
| UC-13 | Execute Agent Run (Provider Call) | async | no | **yes** |
| UC-14 | Handle Run Failure | async | no | no |
| UC-15 | Handle Run Timeout | async | no | no |
| UC-16 | Supersede Run (Retry) | sync | no | no |
| UC-17 | Block Task | sync | no | no |
| UC-18 | Unblock Task | sync | no | no |
| UC-19 | Escalate Task | sync | no | no |
| UC-20 | Resolve Task Escalation | sync | **yes** | no |
| UC-21 | Cancel Task | sync | **yes** | no |
| UC-22 | Pause Project | sync | **yes** | no |
| UC-23 | Resume Project | sync | **yes** | no |
| UC-24 | Archive Project | sync | **yes** | no |
| UC-25 | Freeze Artifact as Canonical | sync | **yes** | no |
| UC-26 | Supersede Artifact | sync | no | no |

---

## 3 — Use Case Details

---

### UC-01 — Activate Project

**Name:** Activate Project

**Trigger:** API call `POST /projects/{id}/activate`

**Preconditions:**
1. Project.state == `scoped`
2. Documents exist: `00-project-brief.md`, `04-domain-boundaries.md`, `05-lifecycle-state-machine.md` (linked to project)
3. Approval record exists with type = `project_activation` and state = `approved`

**State transitions triggered:**
1. Project: `scoped` → `active` (guard P2)

**Entities affected:**
- Project (state update)
- Approval (read, verified)
- Document (read, verified existence)

**Activity events emitted:**
- `project.activated` — entity_type: project, actor_type: founder

**Failure paths:**
| Failure | Handling |
|---|---|
| Required docs missing | REJECT with list of missing docs |
| No approved activation approval | REJECT "approval required before activation" |
| Project not in `scoped` state | REJECT "invalid state transition" |

**Sync/Async:** Synchronous

**Requires Founder authority:** **Yes** — founder must have approved the activation approval first

**Calls Provider Layer:** No

---

### UC-02 — Assign Task

**Name:** Assign Task

**Trigger:** API call `POST /tasks/{id}/assign` with `{ owner_role_id }`

**Preconditions:**
1. Task.state IN [`ready`, `rework_required`, `blocked`, `escalated`, `approved`]
2. Per source state:
   - `ready`: AgentRole.status == `active` for owner_role_id
   - `rework_required`: rework notes exist on task
   - `blocked`: blocker_reason is cleared/resolved
   - `escalated`: founder decision exists (linked via Approval or ActivityEvent)
   - `approved`: next stage task is defined (requested_outcome set)
3. Task has: title, purpose, owner_role_id, acceptance_criteria, expected_output_type

**State transitions triggered:**
1. Task: source_state → `assigned` (guards T2, T9, T10, T11, T13)

**Entities affected:**
- Task (state update, owner_role_id update)
- AgentRole (read, validated)

**Activity events emitted:**
- `task.assigned` — entity_type: task, actor_type: system or founder
- If from `rework_required`: `task.reassigned_after_rework`
- If from `escalated`: `task.escalation_resolved`
- If from `blocked`: `task.unblocked`

**Failure paths:**
| Failure | Handling |
|---|---|
| Agent role inactive | REJECT "target role is not active" |
| Missing rework notes (from rework_required) | REJECT "rework notes required" |
| Blocker not cleared (from blocked) | REJECT "blocker still active" |
| No founder decision (from escalated) | REJECT "founder decision required" |
| Invalid source state | REJECT "invalid state transition" |

**Sync/Async:** Synchronous

**Requires Founder authority:** No (except when source is `escalated`, founder decision must pre-exist)

**Calls Provider Layer:** No

---

### UC-03 — Start Run

**Name:** Start Run

**Trigger:** API call `POST /tasks/{id}/runs/start` or internal event `task.assigned` + auto-start policy

**Preconditions:**
1. Task.state == `assigned`
2. ContextPack exists for the task (no waiver allowed — run cannot start without ContextPack)
3. AgentRole (task.owner_role_id) is active
4. Task belongs to an active Project (project.state == `active`)

**State transitions triggered:**
1. Run: create new Run record with state = `created` and run_number = next sequential
2. Run: `created` → `preparing` (guard R1)
3. Task: `assigned` → `in_progress` (guard T3)

**Entities affected:**
- Run (created, state transitions)
- Task (state update)
- ContextPack (read, must exist)
- AgentRole (validated)
- Project (validated)

**Activity events emitted:**
- `run.created` — entity_type: run
- `run.preparing` — entity_type: run
- `task.started` — entity_type: task

**Failure paths:**
| Failure | Handling |
|---|---|
| No ContextPack exists for task | REJECT "ContextPack required — run cannot start without context" |
| Agent role inactive | REJECT "assigned role is not active" |
| Task not in `assigned` state | REJECT "task must be assigned first" |
| Project not active | REJECT "project is not active" |

**Sync/Async:** Asynchronous — run preparation may involve context assembly

**Requires Founder authority:** No

**Calls Provider Layer:** No (provider call happens in UC-13)

---

### UC-04 — Complete Run

**Name:** Complete Run (Output Produced)

**Trigger:** Internal event from execution engine — run finished successfully

**Preconditions:**
1. Run.state == `running`
2. At least one Artifact exists linked to this run (run_id or task_id)
3. Artifact(s) have content or file reference

**State transitions triggered:**
1. Run: `running` → `produced_output` (guard R4)
2. Artifact(s): `created` → `classified` if metadata attached (guard A1)

**Entities affected:**
- Run (state update, output_summary set)
- Artifact(s) (state update, classification)
- Task (NOT transitioned here — remains `in_progress`)

**Activity events emitted:**
- `run.produced_output` — entity_type: run
- `artifact.created` — entity_type: artifact (per artifact)
- `artifact.classified` — entity_type: artifact (per artifact, if auto-classified)

**Failure paths:**
| Failure | Handling |
|---|---|
| No artifacts produced | REJECT — cannot move to produced_output; move to `failed` instead via UC-14 |
| Run not in `running` state | REJECT "invalid state transition" |
| Artifact missing source linkage | REJECT "artifact invariant violated: must reference task or run" |

**Sync/Async:** Asynchronous — triggered by worker/execution engine

**Requires Founder authority:** No

**Calls Provider Layer:** No (provider call already completed)

---

### UC-05 — Submit Artifact for Review

**Name:** Submit Artifact for Review

**Trigger:** API call `POST /artifacts/{id}/submit` or orchestration action after run completion

**Preconditions:**
1. Artifact.state == `classified`
2. Artifact has source (task_id or run_id is not null)
3. Task.state == `in_progress`
4. Reviewer role exists and is active

**State transitions triggered:**
1. Artifact: `classified` → `submitted` (guard A2)
2. Review: create new Review record with state = `created`
3. Artifact: `submitted` → `under_review` (guard A3)
4. Review: `created` → `in_progress` (guard V1)
5. Task: `in_progress` → `waiting_review` (guard T4)

**Entities affected:**
- Artifact (state transitions)
- Review (created, state transition)
- Task (state update)
- AgentRole (reviewer role validated)

**Activity events emitted:**
- `artifact.submitted` — entity_type: artifact
- `review.created` — entity_type: review
- `artifact.review_started` — entity_type: artifact
- `review.started` — entity_type: review
- `task.waiting_review` — entity_type: task

**Failure paths:**
| Failure | Handling |
|---|---|
| Artifact not classified | REJECT "artifact must be classified before submission" |
| No reviewer role active | REJECT "no active reviewer available" |
| Task not in_progress | REJECT "task must be in progress" |
| Artifact source missing | REJECT "artifact invariant: task_id or run_id required" |

**Sync/Async:** Synchronous

**Requires Founder authority:** No

**Calls Provider Layer:** No

---

### UC-06 — Resolve Review — Approve

**Name:** Resolve Review — Approve

**Trigger:** API call `POST /reviews/{id}/resolve` with `{ verdict: "approved" | "approved_with_notes" }`

**Preconditions:**
1. Review.state == `in_progress`
2. No blocking issues recorded (for `approved`) OR only non-blocking notes (for `approved_with_notes`)
3. Target artifact exists and is in `under_review` state

**State transitions triggered:**
1. Review: `in_progress` → `approved` or `approved_with_notes` (guards V4, V5)
2. Review: `approved`/`approved_with_notes` → `closed` (guards V8, V9) — Review must reach terminal state before cascading
3. Artifact: `under_review` → `accepted` (guard A4)
4. Task: `waiting_review` → `approved` (guard T7)

**Entities affected:**
- Review (verdict set, state transitions, closed_at set — completed first)
- Artifact (state update — only after review is closed)
- Task (state update — only after review is closed)

**Activity events emitted:**
- `review.approved` or `review.approved_with_notes` — entity_type: review
- `review.closed` — entity_type: review
- `artifact.accepted` — entity_type: artifact
- `task.approved` — entity_type: task

**Failure paths:**
| Failure | Handling |
|---|---|
| Blocking issues exist (for approved) | REJECT "cannot approve with blocking issues" |
| Review not in_progress | REJECT "invalid state transition" |
| Artifact not under_review | REJECT "artifact state mismatch" |

**Sync/Async:** Synchronous

**Requires Founder authority:** No

**Calls Provider Layer:** No

---

### UC-07 — Resolve Review — Reject (Rework Loop)

**Name:** Resolve Review — Reject (Task Rework Loop)

**Trigger:** API call `POST /reviews/{id}/resolve` with `{ verdict: "rejected" }`

**Preconditions:**
1. Review.state == `in_progress`
2. Blocking issues recorded
3. Rejection reason recorded
4. Target artifact exists and is in `under_review` state

**State transitions triggered:**
1. Review: `in_progress` → `rejected` (guard V6)
2. Artifact: `under_review` → `rejected` (guard A5)
3. Task: `waiting_review` → `rework_required` (guard T8)
4. Review: `rejected` → `closed` (guard V10) — rework path recorded

**Entities affected:**
- Review (verdict set, state transitions, closed_at set)
- Artifact (state update)
- Task (state update)

**Activity events emitted:**
- `review.rejected` — entity_type: review
- `artifact.rejected` — entity_type: artifact
- `task.rework_required` — entity_type: task
- `review.closed` — entity_type: review

**Failure paths:**
| Failure | Handling |
|---|---|
| No rejection reason | REJECT "rejection reason required" |
| No blocking issues | REJECT "blocking issues must be recorded for rejection" |
| Review not in_progress | REJECT "invalid state transition" |

**Post-condition:**
- Task is now in `rework_required` and must be reassigned via UC-02 (assign with rework notes)
- A new run (UC-03) will produce revised artifacts
- A new review cycle (UC-05) will begin

**Sync/Async:** Synchronous

**Requires Founder authority:** No

**Calls Provider Layer:** No

---

### UC-08 — Resolve Review — Escalate

**Name:** Resolve Review — Escalate to Founder

**Trigger:** API call `POST /reviews/{id}/resolve` with `{ verdict: "escalated" }`

**Preconditions:**
1. Review.state == `in_progress`
2. Escalation reason recorded

**State transitions triggered:**
1. Review: `in_progress` → `escalated` (guard V7)

**Entities affected:**
- Review (verdict set, state update)

**Activity events emitted:**
- `review.escalated` — entity_type: review, actor_type: agent_role

**Failure paths:**
| Failure | Handling |
|---|---|
| No escalation reason | REJECT "escalation reason required" |
| Review not in_progress | REJECT "invalid state transition" |

**Post-condition:**
- Founder must decide. Once decided, UC-20 or direct review closure (V11) resolves it.
- Review remains open until founder acts.

**Sync/Async:** Synchronous

**Requires Founder authority:** No (escalation is initiated by reviewer; resolution requires founder)

**Calls Provider Layer:** No

---

### UC-09 — Request Approval

**Name:** Request Founder Approval

**Trigger:** API call `POST /approvals` with `{ approval_type, target_type, target_id, summary }`

**Preconditions:**
1. Target entity exists (project, task, artifact, review, or document)
2. Approval type is valid for target (per doc 05 §9.5):
   - `project_activation` → target_type: project
   - `architecture` → target_type: artifact or document
   - `schema` → target_type: artifact or task
   - `scope_change` → target_type: task or project
   - `release` → target_type: project
   - `cancellation` → target_type: task
3. No duplicate pending approval for same target_type + target_id + approval_type
4. Requesting role exists (if agent-initiated)

**State transitions triggered:**
1. Approval: create with state = `pending`

**Entities affected:**
- Approval (created)
- Target entity (read, not modified)
- AgentRole (validated if requested_by_role_id provided)

**Activity events emitted:**
- `approval.requested` — entity_type: approval, actor_type: agent_role or system

**Failure paths:**
| Failure | Handling |
|---|---|
| Target entity not found | REJECT "target does not exist" |
| Invalid approval_type for target_type | REJECT "approval type mismatch" |
| Duplicate pending approval exists | REJECT "pending approval already exists" |

**Sync/Async:** Synchronous

**Requires Founder authority:** No (anyone can request; only founder can resolve)

**Calls Provider Layer:** No

---

### UC-10 — Resolve Approval

**Name:** Resolve Founder Approval

**Trigger:** API call `POST /approvals/{id}/resolve` with `{ decision: "approved"|"rejected"|"deferred", decision_note }`

**Preconditions:**
1. Approval.state == `pending`
2. Actor == Founder
3. Decision note is not null

**State transitions triggered:**
1. Approval: `pending` → `approved` | `rejected` | `deferred` (guards G1, G2, G3)
2. Approval: decided_at set

**Entities affected:**
- Approval (state update, decision fields set)

**Activity events emitted:**
- `approval.approved` or `approval.rejected` or `approval.deferred` — entity_type: approval, actor_type: founder

**Failure paths:**
| Failure | Handling |
|---|---|
| Approval not pending | REJECT "approval already resolved" |
| Actor is not founder | REJECT "only founder can resolve approvals" |
| No decision note | REJECT "decision note required" |

**Post-condition:**
- For `approved`: downstream use case (UC-01, UC-11, UC-12, UC-25) may now proceed
- For `rejected`: downstream workflow must handle rejection (e.g., task stays blocked or is cancelled)
- For `deferred`: follow-up note recorded; approval remains actionable until replaced or expired

**Sync/Async:** Synchronous

**Requires Founder authority:** **Yes**

**Calls Provider Layer:** No

---

### UC-11 — Complete Task

**Name:** Complete Task

**Trigger:** API call `POST /tasks/{id}/complete` or internal event after approval resolution

**Preconditions:**
1. Task.state == `approved`
2. No unresolved blocking reviews exist for any artifact linked to this task
3. No pending approvals linked to this task
4. Downstream handoff is complete or not required (no pending follow-up defined)

**State transitions triggered:**
1. Task: `approved` → `done` (guard T12)
2. Task: closed_at set
3. Approval(s) linked to task: `approved`/`rejected` → `closed` (guards G5, G6)

**Entities affected:**
- Task (state update, closed_at)
- Approval(s) linked to task (closed)
- Run lifecycle is independent — Complete Task does NOT modify Run state

**Activity events emitted:**
- `task.done` — entity_type: task
- `approval.closed` — entity_type: approval (per approval closed)

**Failure paths:**
| Failure | Handling |
|---|---|
| Task not approved | REJECT "task must be approved first" |
| Unresolved blocking review exists | REJECT "blocking review must be resolved" |
| Pending approval exists | REJECT "pending approval must be resolved" |

**Sync/Async:** Synchronous

**Requires Founder authority:** No

**Calls Provider Layer:** No

---

### UC-12 — Complete Project Milestone

**Name:** Complete Project Milestone

**Trigger:** API call `POST /projects/{id}/complete-milestone`

**Preconditions:**
1. Project.state == `in_review`
2. Approval exists with type = `release` and state = `approved`
3. All tasks in project must be in state `done` or `cancelled`

**State transitions triggered:**
1. Project: `in_review` → `completed` (guard P7)
2. Approval: `approved` → `closed` (guard G5)

**Entities affected:**
- Project (state update)
- Approval (closed)
- Tasks (validated — all must be in terminal state: `done` or `cancelled`)

**Activity events emitted:**
- `project.completed` — entity_type: project, actor_type: founder
- `approval.closed` — entity_type: approval

**Failure paths:**
| Failure | Handling |
|---|---|
| Project not in_review | REJECT "project must be in review" |
| No approved release approval | REJECT "release approval required" |
| Tasks exist in non-terminal state | REJECT "all tasks must be done or cancelled" |

**Sync/Async:** Synchronous

**Requires Founder authority:** **Yes** — release approval must pre-exist

**Calls Provider Layer:** No

---

### UC-13 — Execute Agent Run (Provider Call)

**Name:** Execute Agent Run via Provider

**Trigger:** Internal event `run.preparing` completed → worker picks up run execution

**Preconditions:**
1. Run.state == `preparing`
2. ContextPack available (linked or assembled)
3. RoutingPolicy exists for task.domain + task.owner_role_id
4. Provider is healthy (status != `unavailable`, `misconfigured`)
5. ProviderCredential is valid (status = `valid`)
6. Preferred ProviderModel is active

**State transitions triggered:**
1. Run: `preparing` → `running` (guard R2)
2. On success: Run → `produced_output` via UC-04
3. On failure: Run → `failed` via UC-14
4. On timeout: Run → `timed_out` via UC-15

**Entities affected:**
- Run (state transitions)
- ProviderUsageLog (created — request logged with tokens, cost estimate, provider, model)
- Artifact(s) (created on success)
- ContextPack (read)
- RoutingPolicy (read)
- Provider (health checked)
- ProviderCredential (validated)
- ProviderModel (selected)

**Activity events emitted:**
- `run.started` — entity_type: run
- `provider.request_sent` — entity_type: run (custom event with provider metadata)
- `provider.request_completed` or `provider.request_failed` — entity_type: run

**Failure paths:**
| Failure | Handling |
|---|---|
| No routing policy found | REJECT "no routing policy for domain/role" |
| Provider unhealthy | If fallback allowed → try fallback provider; else REJECT and move run to `failed` |
| Credential invalid | REJECT and move run to `failed` with reason "credential_invalid" |
| Provider API error | Move run to `failed` via UC-14; log error in ProviderUsageLog |
| Provider rate limit | If fallback allowed and configured → try fallback; else REJECT → `failed` |
| Provider timeout | Move run to `timed_out` via UC-15 |
| Fallback attempted | Log `provider.fallback_used` event; record both primary and fallback in usage log |
| Fallback also fails | Move run to `failed` via UC-14 |

**Sync/Async:** **Asynchronous** — executed by worker process (BullMQ queue)

**Requires Founder authority:** No

**Calls Provider Layer:** **Yes** — this is the primary provider integration point

---

### UC-14 — Handle Run Failure

**Name:** Handle Run Failure

**Trigger:** Internal event — execution error during run, or provider failure from UC-13

**Preconditions:**
1. Run.state IN [`preparing`, `running`]
2. Failure reason available

**State transitions triggered:**
1. Run: current_state → `failed` (guards R3, R5)
2. Run: ended_at set
3. Run: failure_reason set

**Entities affected:**
- Run (state update, failure fields)
- Task (NOT automatically transitioned — orchestrator decides next step)

**Activity events emitted:**
- `run.failed` — entity_type: run, event_payload: { failure_reason, provider if applicable }

**Failure paths:**
| Failure | Handling |
|---|---|
| No failure reason | SET generic "unknown_failure" and proceed |

**Post-condition:**
- Orchestrator evaluates: retry (UC-16), block task (UC-17), or escalate (UC-19)
- Task remains `in_progress` unless explicitly blocked or escalated

**Sync/Async:** Asynchronous

**Requires Founder authority:** No

**Calls Provider Layer:** No

---

### UC-15 — Handle Run Timeout

**Name:** Handle Run Timeout

**Trigger:** Internal event — runtime limit exceeded during execution

**Preconditions:**
1. Run.state == `running`
2. Timeout event recorded

**State transitions triggered:**
1. Run: `running` → `timed_out` (guard R6)
2. Run: ended_at set

**Entities affected:**
- Run (state update)

**Activity events emitted:**
- `run.timed_out` — entity_type: run

**Post-condition:**
- Same as UC-14: orchestrator decides retry, block, or escalate

**Sync/Async:** Asynchronous

**Requires Founder authority:** No

**Calls Provider Layer:** No

---

### UC-16 — Supersede Run (Retry)

**Name:** Supersede Run and Create Retry

**Trigger:** API call `POST /runs/{id}/retry` or orchestrator auto-retry decision

**Preconditions:**
1. Original Run.state IN [`failed`, `timed_out`]
2. Task.state == `in_progress` (still active)
3. Retry policy allows it (not exceeded max retries)

**State transitions triggered:**
1. Original Run: `failed`/`timed_out` → `superseded` (guard R14)
2. Original Run: superseded_by_run_id set
3. New Run: created with state = `created`, retry_of_run_id = original run, run_number = next
4. New Run proceeds via UC-03 (start run) flow

**Entities affected:**
- Original Run (superseded — no intermediate finalized step)
- New Run (created)
- Task (unchanged — remains in_progress)

**Activity events emitted:**
- `run.superseded` — entity_type: run (original)
- `run.created` — entity_type: run (new)

**Failure paths:**
| Failure | Handling |
|---|---|
| Max retries exceeded | REJECT "retry limit reached"; consider UC-17 (block) or UC-19 (escalate) |
| Task no longer in_progress | REJECT "task state does not allow retry" |

**Sync/Async:** Synchronous (creation); new run execution is async

**Requires Founder authority:** No

**Calls Provider Layer:** No (provider call happens in new run's UC-13)

---

### UC-17 — Block Task

**Name:** Block Task

**Trigger:** API call `POST /tasks/{id}/block` with `{ blocker_reason }` or orchestrator decision after repeated failures

**Preconditions:**
1. Task.state == `in_progress`
2. Blocker reason is not null

**State transitions triggered:**
1. Task: `in_progress` → `blocked` (guard T5)

**Entities affected:**
- Task (state update, blocker_reason set)

**Activity events emitted:**
- `task.blocked` — entity_type: task

**Failure paths:**
| Failure | Handling |
|---|---|
| No blocker reason | REJECT "blocker reason required" |
| Task not in_progress | REJECT "invalid state transition" |

**Sync/Async:** Synchronous

**Requires Founder authority:** No

**Calls Provider Layer:** No

---

### UC-18 — Unblock Task

**Name:** Unblock Task

**Trigger:** API call `POST /tasks/{id}/unblock`

**Preconditions:**
1. Task.state == `blocked`
2. Blocker reason has been addressed (cleared or resolved)

**State transitions triggered:**
1. Task: `blocked` → `assigned` (guard T10)
2. Task: blocker_reason cleared

**Entities affected:**
- Task (state update, blocker_reason cleared)

**Activity events emitted:**
- `task.unblocked` — entity_type: task

**Failure paths:**
| Failure | Handling |
|---|---|
| Blocker not resolved | REJECT "blocker must be resolved first" |
| Task not blocked | REJECT "invalid state transition" |

**Sync/Async:** Synchronous

**Requires Founder authority:** No

**Calls Provider Layer:** No

---

### UC-19 — Escalate Task

**Name:** Escalate Task to Founder

**Trigger:** API call `POST /tasks/{id}/escalate` with `{ escalation_reason }`

**Preconditions:**
1. Task.state == `in_progress`
2. Escalation reason is not null

**State transitions triggered:**
1. Task: `in_progress` → `escalated` (guard T6)

**Entities affected:**
- Task (state update, escalation_reason set)

**Activity events emitted:**
- `task.escalated` — entity_type: task, actor_type: agent_role

**Failure paths:**
| Failure | Handling |
|---|---|
| No escalation reason | REJECT "escalation reason required" |
| Task not in_progress | REJECT "invalid state transition" |

**Sync/Async:** Synchronous

**Requires Founder authority:** No (escalation is request to founder)

**Calls Provider Layer:** No

---

### UC-20 — Resolve Task Escalation

**Name:** Resolve Task Escalation

**Trigger:** API call `POST /tasks/{id}/resolve-escalation` with `{ decision, decision_note }`

**Preconditions:**
1. Task.state == `escalated`
2. Actor == Founder
3. Decision recorded (reassign, cancel, or modify scope)

**State transitions triggered:**
1. If decision == "reassign": Task: `escalated` → `assigned` (guard T11)
2. If decision == "cancel": Task: `escalated` → `cancelled` (guard T14)
3. Decision note stored (via ActivityEvent or task field)

**Entities affected:**
- Task (state update)

**Activity events emitted:**
- `task.escalation_resolved` — entity_type: task, actor_type: founder
- If cancelled: `task.cancelled` — entity_type: task

**Failure paths:**
| Failure | Handling |
|---|---|
| Task not escalated | REJECT "task is not in escalated state" |
| Actor not founder | REJECT "only founder can resolve escalations" |
| No decision | REJECT "decision required" |

**Sync/Async:** Synchronous

**Requires Founder authority:** **Yes**

**Calls Provider Layer:** No

---

### UC-21 — Cancel Task

**Name:** Cancel Task

**Trigger:** API call `POST /tasks/{id}/cancel` with `{ cancellation_reason }`

**Preconditions:**
1. Task.state NOT IN [`done`, `cancelled`]
2. Actor == Founder
3. Cancellation reason is not null

**State transitions triggered:**
1. Task: current_state → `cancelled` (guard T14)
2. Task: closed_at set
3. Any active Runs for this task: → `cancelled` → `finalized` (guards R7, R11)
4. Open Reviews (state `in_progress` or `needs_clarification`):
   - Set review.verdict = `rejected`
   - Set review.reason = "Task cancelled by founder"
   - Transition review: current_state → `rejected` (guard V6) → `closed` (guard V10)
   - Review must end with explicit verdict — silent closure is forbidden

**Entities affected:**
- Task (state update, closed_at)
- Run(s) (cancelled and finalized)
- Review(s) (verdict set to rejected, reason set, transitioned to closed via guard V10)

**Activity events emitted:**
- `task.cancelled` — entity_type: task, actor_type: founder
- `run.cancelled` — entity_type: run (per active run)
- `review.rejected` — entity_type: review (per open review, with reason "Task cancelled by founder")
- `review.closed` — entity_type: review (per open review)

**Failure paths:**
| Failure | Handling |
|---|---|
| Task already terminal | REJECT "task is already done or cancelled" |
| Actor not founder | REJECT "only founder can cancel tasks" |
| No cancellation reason | REJECT "cancellation reason required" |

**Sync/Async:** Synchronous

**Requires Founder authority:** **Yes**

**Calls Provider Layer:** No

---

### UC-22 — Pause Project

**Name:** Pause Project

**Trigger:** API call `POST /projects/{id}/pause`

**Preconditions:**
1. Project.state == `active`
2. Actor == Founder

**State transitions triggered:**
1. Project: `active` → `paused` (guard P8)

**Entities affected:**
- Project (state update)

**Activity events emitted:**
- `project.paused` — entity_type: project, actor_type: founder

**Failure paths:**
| Failure | Handling |
|---|---|
| Project not active | REJECT "project must be active to pause" |
| Actor not founder | REJECT "only founder can pause projects" |

**Sync/Async:** Synchronous

**Requires Founder authority:** **Yes**

**Calls Provider Layer:** No

---

### UC-23 — Resume Project

**Name:** Resume Project

**Trigger:** API call `POST /projects/{id}/resume`

**Preconditions:**
1. Project.state == `paused`
2. Actor == Founder

**State transitions triggered:**
1. Project: `paused` → `active` (guard P9)

**Entities affected:**
- Project (state update)

**Activity events emitted:**
- `project.resumed` — entity_type: project, actor_type: founder

**Failure paths:**
| Failure | Handling |
|---|---|
| Project not paused | REJECT "project must be paused to resume" |
| Actor not founder | REJECT "only founder can resume projects" |

**Sync/Async:** Synchronous

**Requires Founder authority:** **Yes**

**Calls Provider Layer:** No

---

### UC-24 — Archive Project

**Name:** Archive Project

**Trigger:** API call `POST /projects/{id}/archive`

**Preconditions:**
1. Project.state IN [`completed`, `paused`]
2. Actor == Founder

**State transitions triggered:**
1. Project: current_state → `archived` (guards P10, P11)
2. Project: archived_at set

**Entities affected:**
- Project (state update, archived_at)

**Activity events emitted:**
- `project.archived` — entity_type: project, actor_type: founder

**Failure paths:**
| Failure | Handling |
|---|---|
| Project not completed or paused | REJECT "project must be completed or paused to archive" |
| Actor not founder | REJECT "only founder can archive projects" |

**Sync/Async:** Synchronous

**Requires Founder authority:** **Yes**

**Calls Provider Layer:** No

---

### UC-25 — Freeze Artifact as Canonical

**Name:** Freeze Artifact as Canonical

**Trigger:** API call `POST /artifacts/{id}/freeze`

**Preconditions:**
1. Artifact.state == `accepted`
2. Freeze reason provided
3. Actor == Founder or system canonical lock

**State transitions triggered:**
1. Artifact: `accepted` → `frozen` (guard A6)
2. Artifact: canonical_flag = true

**Entities affected:**
- Artifact (state update, canonical_flag)

**Activity events emitted:**
- `artifact.frozen` — entity_type: artifact, actor_type: founder

**Failure paths:**
| Failure | Handling |
|---|---|
| Artifact not accepted | REJECT "only accepted artifacts can be frozen" |
| No freeze reason | REJECT "freeze reason required" |

**Sync/Async:** Synchronous

**Requires Founder authority:** **Yes**

**Calls Provider Layer:** No

---

### UC-26 — Supersede Artifact

**Name:** Supersede Artifact

**Trigger:** Internal event — newer approved artifact replaces existing one, or corrected artifact replaces rejected one

**Preconditions:**
1. Original Artifact.state IN [`accepted`, `rejected`]
2. Replacement artifact exists and is linked (supersedes_artifact_id on replacement)

**State transitions triggered:**
1. Original Artifact: `accepted`/`rejected` → `superseded` (guards A7, A8)

**Entities affected:**
- Original Artifact (state update)
- Replacement Artifact (supersedes_artifact_id reference validated)

**Activity events emitted:**
- `artifact.superseded` — entity_type: artifact

**Failure paths:**
| Failure | Handling |
|---|---|
| No replacement linked | REJECT "replacement artifact must be linked" |
| Original not in accepted/rejected | REJECT "invalid state transition" |

**Sync/Async:** Synchronous

**Requires Founder authority:** No

**Calls Provider Layer:** No

---

## 4 — Orchestration Workflow Chains

These are multi-use-case sequences that represent complete workflow patterns:

### 4.1 Happy Path: Task Execution

```
UC-02 (Assign Task)
  → UC-03 (Start Run)
    → UC-13 (Execute Agent Run via Provider)
      → UC-04 (Complete Run)
        → UC-05 (Submit Artifact for Review)
          → UC-06 (Resolve Review — Approve)
            → UC-11 (Complete Task)
```

### 4.2 Rework Loop

```
UC-05 (Submit Artifact for Review)
  → UC-07 (Resolve Review — Reject)
    → UC-02 (Assign Task — from rework_required)
      → UC-03 (Start Run — new attempt)
        → UC-13 (Execute Agent Run)
          → UC-04 (Complete Run)
            → UC-05 (Submit Artifact for Review — new cycle)
```

### 4.3 Run Failure with Retry

```
UC-13 (Execute Agent Run)
  → UC-14 (Handle Run Failure)
    → UC-16 (Supersede Run / Retry)
      → UC-03 (Start Run — retry)
        → UC-13 (Execute Agent Run — retry)
```

### 4.4 Run Failure without Retry

```
UC-13 (Execute Agent Run)
  → UC-14 (Handle Run Failure)
    → UC-17 (Block Task) or UC-19 (Escalate Task)
```

### 4.5 Escalation Resolution

```
UC-19 (Escalate Task)
  → UC-20 (Resolve Task Escalation)
    → UC-02 (Assign Task — from escalated) or UC-21 (Cancel Task)
```

### 4.6 Project Lifecycle

```
UC-09 (Request Approval — project_activation)
  → UC-10 (Resolve Approval — approved)
    → UC-01 (Activate Project)
      → [task execution cycles]
        → UC-09 (Request Approval — release)
          → UC-10 (Resolve Approval — approved)
            → UC-12 (Complete Project Milestone)
              → UC-24 (Archive Project)
```

---

## 5 — Summary Matrix

| UC | Name | Entities Modified | Events | Sync | Founder | Provider |
|---|---|---|---|---|---|---|
| UC-01 | Activate Project | Project, Approval | 1 | sync | yes | no |
| UC-02 | Assign Task | Task, AgentRole | 1-2 | sync | no* | no |
| UC-03 | Start Run | Run, Task, ContextPack | 3 | async | no | no |
| UC-04 | Complete Run | Run, Artifact(s) | 2-3 | async | no | no |
| UC-05 | Submit Artifact | Artifact, Review, Task | 5 | sync | no | no |
| UC-06 | Approve Review | Review, Artifact, Task | 4 | sync | no | no |
| UC-07 | Reject Review | Review, Artifact, Task | 4 | sync | no | no |
| UC-08 | Escalate Review | Review | 1 | sync | no | no |
| UC-09 | Request Approval | Approval | 1 | sync | no | no |
| UC-10 | Resolve Approval | Approval | 1 | sync | yes | no |
| UC-11 | Complete Task | Task, Approval(s) | 1-2 | sync | no | no |
| UC-12 | Complete Milestone | Project, Approval | 2 | sync | yes | no |
| UC-13 | Execute Agent Run | Run, ProviderUsageLog | 2-3 | async | no | **yes** |
| UC-14 | Handle Run Failure | Run | 1 | async | no | no |
| UC-15 | Handle Run Timeout | Run | 1 | async | no | no |
| UC-16 | Supersede Run | Run (old+new) | 2 | sync | no | no |
| UC-17 | Block Task | Task | 1 | sync | no | no |
| UC-18 | Unblock Task | Task | 1 | sync | no | no |
| UC-19 | Escalate Task | Task | 1 | sync | no | no |
| UC-20 | Resolve Escalation | Task | 1-2 | sync | yes | no |
| UC-21 | Cancel Task | Task, Run(s), Review(s) | 2-4 | sync | yes | no |
| UC-22 | Pause Project | Project | 1 | sync | yes | no |
| UC-23 | Resume Project | Project | 1 | sync | yes | no |
| UC-24 | Archive Project | Project | 1 | sync | yes | no |
| UC-25 | Freeze Artifact | Artifact | 1 | sync | yes | no |
| UC-26 | Supersede Artifact | Artifact | 1 | sync | no | no |

\* UC-02 does not require founder authority directly, but when source state is `escalated`, a founder decision must already exist.

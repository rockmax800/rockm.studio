# 21 — Lifecycle Transition Guards V1

## 1 — Purpose

This document defines the strict transition guard matrix for all lifecycle entities in AI Workshop OS.

Source of truth: `docs/05-lifecycle-state-machine.md`.

No interpretation beyond what the lifecycle document defines.

---

## 2 — Project Transitions

### 2.1 Allowed Transitions Table

| # | from_state | to_state | required_conditions | side_effects | forbidden_if |
|---|---|---|---|---|---|
| P1 | `draft` | `scoped` | minimum project brief exists | emit `project.scoped` event | brief is empty or missing |
| P2 | `scoped` | `active` | required V1 docs exist (`00-project-brief.md`, `04-domain-boundaries.md`, `05-lifecycle-state-machine.md`); **founder approval exists** | emit `project.activated` event; create approval record if not present | any required doc missing; no founder approval |
| P3 | `active` | `blocked` | blocker reason recorded | emit `project.blocked` event | blocker_reason is null or empty |
| P4 | `blocked` | `active` | blocking issue cleared (blocker_reason nullified or resolved) | emit `project.unblocked` event | blocker still active |
| P5 | `active` | `in_review` | milestone artifacts exist (at least one artifact in `accepted` or `frozen` state linked to project) | emit `project.review_started` event | no milestone artifacts exist |
| P6 | `in_review` | `active` | founder requests more work (rework decision recorded) | emit `project.rework_requested` event | no founder decision recorded |
| P7 | `in_review` | `completed` | founder approves milestone or release; **approval record exists with state=approved**; acceptance criteria met | emit `project.completed` event; close approval | approval not approved; active critical tasks exist |
| P8 | `active` | `paused` | founder decision | emit `project.paused` event | none |
| P9 | `paused` | `active` | founder decision | emit `project.resumed` event | none |
| P10 | `completed` | `archived` | founder decision | emit `project.archived` event; set archived_at | none |
| P11 | `paused` | `archived` | founder decision | emit `project.archived` event; set archived_at | none |

### 2.2 Guard Pseudo-Code

```pseudo
function guardProjectTransition(project, to_state):

  if to_state == "scoped":
    ASSERT project.state == "draft"
    ASSERT project.brief IS NOT NULL AND project.brief IS NOT EMPTY
    RETURN ALLOW

  if to_state == "active":
    if project.state == "scoped":
      ASSERT doc_exists(project, "00-project-brief.md")
      ASSERT doc_exists(project, "04-domain-boundaries.md")
      ASSERT doc_exists(project, "05-lifecycle-state-machine.md")
      ASSERT approval_exists(project, type="project_activation", state="approved")
      RETURN ALLOW
    if project.state == "blocked":
      ASSERT project.blocker_reason IS RESOLVED
      RETURN ALLOW
    if project.state == "paused":
      ASSERT actor == FOUNDER
      RETURN ALLOW
    if project.state == "in_review":
      ASSERT actor == FOUNDER
      ASSERT founder_decision_recorded(project, "rework")
      RETURN ALLOW
    DENY "invalid source state for active"

  if to_state == "blocked":
    ASSERT project.state == "active"
    ASSERT blocker_reason IS NOT NULL
    RETURN ALLOW

  if to_state == "in_review":
    ASSERT project.state == "active"
    ASSERT count(milestone_artifacts(project, state IN ["accepted", "frozen"])) > 0
    RETURN ALLOW

  if to_state == "completed":
    ASSERT project.state == "in_review"
    ASSERT approval_exists(project, type="release" OR type="project_activation", state="approved")
    ASSERT count(tasks(project, state NOT IN ["done", "cancelled"])) == 0
    RETURN ALLOW

  if to_state == "paused":
    ASSERT project.state == "active"
    ASSERT actor == FOUNDER
    RETURN ALLOW

  if to_state == "archived":
    ASSERT project.state IN ["completed", "paused"]
    ASSERT actor == FOUNDER
    RETURN ALLOW

  DENY "transition not allowed"
```

### 2.3 Cross-Entity Requirements

| Transition | Requires Review? | Requires Approval? | Requires Founder Decision? | Requires Artifact? | Requires ContextPack? |
|---|---|---|---|---|---|
| P2 scoped→active | No | **Yes** (project_activation) | **Yes** | No | No |
| P5 active→in_review | No | No | No | **Yes** (milestone artifacts) | No |
| P6 in_review→active | No | No | **Yes** | No | No |
| P7 in_review→completed | No | **Yes** (release) | **Yes** | **Yes** | No |

### 2.4 Orchestration & CRUD Rules

| Transition | Must go through Orchestration Module? | Must NEVER be triggered by direct CRUD update? |
|---|---|---|
| P1 draft→scoped | No | No |
| P2 scoped→active | **Yes** | **Yes** |
| P3 active→blocked | No | **Yes** |
| P4 blocked→active | No | **Yes** |
| P5 active→in_review | **Yes** | **Yes** |
| P6 in_review→active | **Yes** | **Yes** |
| P7 in_review→completed | **Yes** | **Yes** |
| P8 active→paused | No | **Yes** |
| P9 paused→active | No | **Yes** |
| P10 completed→archived | No | **Yes** |
| P11 paused→archived | No | **Yes** |

---

## 3 — Task Transitions

### 3.1 Allowed Transitions Table

| # | from_state | to_state | required_conditions | side_effects | forbidden_if |
|---|---|---|---|---|---|
| T1 | `draft` | `ready` | acceptance_criteria exist; title exists; purpose exists; owner_role defined; expected_output_type defined | emit `task.ready` event | any required field missing |
| T2 | `ready` | `assigned` | eligible role exists; owner_role_id set | emit `task.assigned` event | no eligible active role |
| T3 | `assigned` | `in_progress` | context available (ContextPack exists for task); run started or owner begins work | emit `task.started` event | no ContextPack exists |
| T4 | `in_progress` | `waiting_review` | artifact submitted (at least one artifact linked to task in `submitted` or higher state) | emit `task.waiting_review` event | no output artifact exists |
| T5 | `in_progress` | `blocked` | blocker_reason recorded | emit `task.blocked` event | blocker_reason is null |
| T6 | `in_progress` | `escalated` | escalation_reason recorded | emit `task.escalated` event | escalation_reason is null |
| T7 | `waiting_review` | `approved` | review verdict = `approved` or `approved_with_notes`; review record exists and linked | emit `task.approved` event | no review exists; review verdict is rejected or absent |
| T8 | `waiting_review` | `rework_required` | review verdict = `rejected`; review record exists | emit `task.rework_required` event; create rework notes | review verdict is not rejected |
| T9 | `rework_required` | `assigned` | rework notes exist; task returned to owner | emit `task.reassigned` event | rework notes missing |
| T10 | `blocked` | `assigned` | blocker resolved; blocker_reason cleared; owner role restored | emit `task.unblocked` event | blocker still active |
| T11 | `escalated` | `assigned` | founder decision recorded; decision linked to task | emit `task.escalation_resolved` event | no founder decision |
| T12 | `approved` | `done` | no further approval needed; downstream handoff complete or none needed; review state is resolved (closed); required approvals completed | emit `task.done` event; set closed_at | unresolved blocking review exists; pending approval exists |
| T13 | `approved` | `assigned` | next stage task defined; follow-up implementation needed | emit `task.reassigned_followup` event | no next stage defined |
| T14 | any non-terminal | `cancelled` | cancellation_reason recorded; actor == FOUNDER | emit `task.cancelled` event; set closed_at | cancellation_reason missing; actor is not founder |

### 3.2 Guard Pseudo-Code

```pseudo
function guardTaskTransition(task, to_state):

  ASSERT task.state NOT IN ["done", "cancelled"]
    OR DENY "cannot transition from terminal state"

  if to_state == "ready":
    ASSERT task.state == "draft"
    ASSERT task.title IS NOT NULL
    ASSERT task.purpose IS NOT NULL
    ASSERT task.owner_role_id IS NOT NULL
    ASSERT task.acceptance_criteria IS NOT EMPTY
    ASSERT task.expected_output_type IS NOT NULL
    RETURN ALLOW

  if to_state == "assigned":
    ASSERT task.state IN ["ready", "rework_required", "blocked", "escalated", "approved"]
    if task.state == "ready":
      ASSERT agent_role_active(task.owner_role_id)
    if task.state == "rework_required":
      ASSERT rework_notes_exist(task)
    if task.state == "blocked":
      ASSERT task.blocker_reason IS RESOLVED
    if task.state == "escalated":
      ASSERT founder_decision_exists(task)
    if task.state == "approved":
      ASSERT next_stage_defined(task)
    RETURN ALLOW

  if to_state == "in_progress":
    ASSERT task.state == "assigned"
    ASSERT context_pack_exists(task)
    RETURN ALLOW

  if to_state == "waiting_review":
    ASSERT task.state == "in_progress"
    ASSERT count(artifacts(task, state IN ["submitted", "under_review", "accepted", "rejected"])) > 0
    RETURN ALLOW

  if to_state == "blocked":
    ASSERT task.state == "in_progress"
    ASSERT task.blocker_reason IS NOT NULL
    RETURN ALLOW

  if to_state == "escalated":
    ASSERT task.state == "in_progress"
    ASSERT task.escalation_reason IS NOT NULL
    RETURN ALLOW

  if to_state == "approved":
    ASSERT task.state == "waiting_review"
    review = get_active_review(task)
    ASSERT review IS NOT NULL
    ASSERT review.verdict IN ["approved", "approved_with_notes"]
    RETURN ALLOW

  if to_state == "rework_required":
    ASSERT task.state == "waiting_review"
    review = get_active_review(task)
    ASSERT review IS NOT NULL
    ASSERT review.verdict == "rejected"
    RETURN ALLOW

  if to_state == "done":
    ASSERT task.state == "approved"
    ASSERT no_unresolved_blocking_reviews(task)
    ASSERT all_reviews_closed(task)
    ASSERT no_pending_approvals(task)
    RETURN ALLOW

  if to_state == "cancelled":
    ASSERT task.state NOT IN ["done", "cancelled"]
    ASSERT actor == FOUNDER
    ASSERT cancellation_reason IS NOT NULL
    RETURN ALLOW

  DENY "transition not allowed"
```

### 3.3 Cross-Entity Requirements

| Transition | Requires Review? | Requires Approval? | Requires Founder Decision? | Requires Artifact? | Requires ContextPack? |
|---|---|---|---|---|---|
| T3 assigned→in_progress | No | No | No | No | **Yes** |
| T4 in_progress→waiting_review | No | No | No | **Yes** | No |
| T7 waiting_review→approved | **Yes** (verdict approved) | No | No | No | No |
| T8 waiting_review→rework_required | **Yes** (verdict rejected) | No | No | No | No |
| T11 escalated→assigned | No | No | **Yes** | No | No |
| T12 approved→done | **Yes** (closed) | **Yes** (if applicable) | No | No | No |
| T14 any→cancelled | No | No | **Yes** | No | No |

### 3.4 Orchestration & CRUD Rules

| Transition | Must go through Orchestration Module? | Must NEVER be triggered by direct CRUD update? |
|---|---|---|
| T1 draft→ready | No | No |
| T2 ready→assigned | **Yes** | **Yes** |
| T3 assigned→in_progress | **Yes** | **Yes** |
| T4 in_progress→waiting_review | **Yes** | **Yes** |
| T5 in_progress→blocked | No | **Yes** |
| T6 in_progress→escalated | No | **Yes** |
| T7 waiting_review→approved | **Yes** | **Yes** |
| T8 waiting_review→rework_required | **Yes** | **Yes** |
| T9 rework_required→assigned | **Yes** | **Yes** |
| T10 blocked→assigned | **Yes** | **Yes** |
| T11 escalated→assigned | **Yes** | **Yes** |
| T12 approved→done | **Yes** | **Yes** |
| T13 approved→assigned | **Yes** | **Yes** |
| T14 any→cancelled | No | **Yes** |

---

## 4 — Run Transitions

### 4.1 Allowed Transitions Table

| # | from_state | to_state | required_conditions | side_effects | forbidden_if |
|---|---|---|---|---|---|
| R1 | `created` | `preparing` | task exists; agent_role exists and is active | emit `run.preparing` event | task does not exist; agent role inactive |
| R2 | `preparing` | `running` | context_pack available; setup completed | emit `run.started` event; set started_at | context_pack missing |
| R3 | `preparing` | `failed` | failure_reason recorded | emit `run.failed` event; set ended_at | failure_reason is null |
| R4 | `running` | `produced_output` | at least one output artifact exists linked to run | emit `run.produced_output` event | no output exists |
| R5 | `running` | `failed` | failure_reason recorded | emit `run.failed` event; set ended_at | failure_reason is null |
| R6 | `running` | `timed_out` | timeout event recorded | emit `run.timed_out` event; set ended_at | no timeout event |
| R7 | `running` | `cancelled` | cancellation recorded | emit `run.cancelled` event; set ended_at | no cancellation reason |
| R8 | `produced_output` | `finalized` | artifacts stored and linked (artifact_linkage_complete) | emit `run.finalized` event; set ended_at if not set | artifact linkage incomplete |
| R9 | `failed` | `finalized` | failure classification exists | emit `run.finalized` event | no failure classification |
| R10 | `timed_out` | `finalized` | timeout classification exists | emit `run.finalized` event | no timeout classification |
| R11 | `cancelled` | `finalized` | cancellation logged | emit `run.finalized` event | none |
| R12 | `created` | `superseded` | newer run created before start; replacement_run_id recorded | emit `run.superseded` event | no replacement recorded |
| R13 | `preparing` | `superseded` | newer run replaces this setup; replacement_run_id recorded | emit `run.superseded` event | no replacement recorded |
| R14 | `failed` | `superseded` | retry launched; newer_run_id linked | emit `run.superseded` event | no newer run linked |

### 4.2 Guard Pseudo-Code

```pseudo
function guardRunTransition(run, to_state):

  ASSERT run.state NOT IN ["finalized", "superseded"]
    OR DENY "cannot transition from terminal state"

  if to_state == "preparing":
    ASSERT run.state == "created"
    ASSERT task_exists(run.task_id)
    ASSERT agent_role_active(run.agent_role_id)
    RETURN ALLOW

  if to_state == "running":
    ASSERT run.state == "preparing"
    ASSERT context_pack_available(run)
    RETURN ALLOW

  if to_state == "produced_output":
    ASSERT run.state == "running"
    ASSERT count(artifacts(run)) > 0
    RETURN ALLOW

  if to_state == "failed":
    ASSERT run.state IN ["preparing", "running"]
    ASSERT run.failure_reason IS NOT NULL
    RETURN ALLOW

  if to_state == "timed_out":
    ASSERT run.state == "running"
    ASSERT timeout_event_recorded(run)
    RETURN ALLOW

  if to_state == "cancelled":
    ASSERT run.state == "running"
    ASSERT cancellation_reason_recorded(run)
    RETURN ALLOW

  if to_state == "finalized":
    ASSERT run.state IN ["produced_output", "failed", "timed_out", "cancelled"]
    if run.state == "produced_output":
      ASSERT artifact_linkage_complete(run)
    if run.state == "failed":
      ASSERT failure_classification_exists(run)
    if run.state == "timed_out":
      ASSERT timeout_classification_exists(run)
    RETURN ALLOW

  if to_state == "superseded":
    ASSERT run.state IN ["created", "preparing", "failed"]
    ASSERT replacement_run_id IS NOT NULL
    RETURN ALLOW

  DENY "transition not allowed"
```

### 4.3 Cross-Entity Requirements

| Transition | Requires Review? | Requires Approval? | Requires Founder Decision? | Requires Artifact? | Requires ContextPack? |
|---|---|---|---|---|---|
| R1 created→preparing | No | No | No | No | No |
| R2 preparing→running | No | No | No | No | **Yes** |
| R4 running→produced_output | No | No | No | **Yes** | No |
| R8 produced_output→finalized | No | No | No | **Yes** (linkage) | No |

### 4.4 Orchestration & CRUD Rules

| Transition | Must go through Orchestration Module? | Must NEVER be triggered by direct CRUD update? |
|---|---|---|
| R1 created→preparing | **Yes** | **Yes** |
| R2 preparing→running | **Yes** | **Yes** |
| R3 preparing→failed | No | **Yes** |
| R4 running→produced_output | **Yes** | **Yes** |
| R5 running→failed | No | **Yes** |
| R6 running→timed_out | No | **Yes** |
| R7 running→cancelled | No | **Yes** |
| R8 produced_output→finalized | **Yes** | **Yes** |
| R9 failed→finalized | **Yes** | **Yes** |
| R10 timed_out→finalized | **Yes** | **Yes** |
| R11 cancelled→finalized | No | **Yes** |
| R12 created→superseded | **Yes** | **Yes** |
| R13 preparing→superseded | **Yes** | **Yes** |
| R14 failed→superseded | **Yes** | **Yes** |

---

## 5 — Artifact Transitions

### 5.1 Allowed Transitions Table

| # | from_state | to_state | required_conditions | side_effects | forbidden_if |
|---|---|---|---|---|---|
| A1 | `created` | `classified` | metadata attached; source task_id or run_id exists | emit `artifact.classified` event | source task and run both null |
| A2 | `classified` | `submitted` | target review or consumer exists | emit `artifact.submitted` event | no target exists |
| A3 | `submitted` | `under_review` | review record exists and linked to artifact | emit `artifact.review_started` event | no review record |
| A4 | `under_review` | `accepted` | positive verdict exists (review verdict = approved or approved_with_notes) | emit `artifact.accepted` event | no positive verdict |
| A5 | `under_review` | `rejected` | rejection reason exists (review verdict = rejected) | emit `artifact.rejected` event | no rejection reason |
| A6 | `accepted` | `frozen` | founder or system locks canonical output; freeze_reason recorded | emit `artifact.frozen` event; set canonical_flag = true | no freeze reason |
| A7 | `accepted` | `superseded` | newer approved artifact version linked; supersedes_artifact_id recorded | emit `artifact.superseded` event | no replacement linked |
| A8 | `rejected` | `superseded` | corrected artifact replaces rejected output; supersedes_artifact_id recorded | emit `artifact.superseded` event | no replacement linked |
| A9 | `frozen` | `archived` | project or version closed; archival_reason recorded | emit `artifact.archived` event | no archival reason |
| A10 | `accepted` | `archived` | non-canonical artifact retired; archival_reason recorded | emit `artifact.archived` event | no archival reason |

### 5.2 Guard Pseudo-Code

```pseudo
function guardArtifactTransition(artifact, to_state):

  ASSERT artifact.state != "archived"
    OR DENY "cannot transition from terminal state"

  if to_state == "classified":
    ASSERT artifact.state == "created"
    ASSERT artifact.task_id IS NOT NULL OR artifact.run_id IS NOT NULL
    ASSERT artifact.artifact_type IS NOT NULL
    RETURN ALLOW

  if to_state == "submitted":
    ASSERT artifact.state == "classified"
    ASSERT target_review_or_consumer_exists(artifact)
    RETURN ALLOW

  if to_state == "under_review":
    ASSERT artifact.state == "submitted"
    ASSERT review_record_exists(artifact)
    RETURN ALLOW

  if to_state == "accepted":
    ASSERT artifact.state == "under_review"
    review = get_review(artifact)
    ASSERT review.verdict IN ["approved", "approved_with_notes"]
    RETURN ALLOW

  if to_state == "rejected":
    ASSERT artifact.state == "under_review"
    review = get_review(artifact)
    ASSERT review.verdict == "rejected"
    ASSERT review.reason IS NOT NULL
    RETURN ALLOW

  if to_state == "frozen":
    ASSERT artifact.state == "accepted"
    ASSERT freeze_reason IS NOT NULL
    RETURN ALLOW

  if to_state == "superseded":
    ASSERT artifact.state IN ["accepted", "rejected"]
    ASSERT artifact.supersedes_artifact_id IS NOT NULL
      OR replacement_artifact_linked(artifact)
    RETURN ALLOW

  if to_state == "archived":
    ASSERT artifact.state IN ["frozen", "accepted"]
    ASSERT archival_reason IS NOT NULL
    RETURN ALLOW

  DENY "transition not allowed"
```

### 5.3 Cross-Entity Requirements

| Transition | Requires Review? | Requires Approval? | Requires Founder Decision? | Requires Artifact Linkage? | Requires ContextPack? |
|---|---|---|---|---|---|
| A1 created→classified | No | No | No | **Yes** (source task or run) | No |
| A3 submitted→under_review | **Yes** (review record) | No | No | No | No |
| A4 under_review→accepted | **Yes** (positive verdict) | No | No | No | No |
| A5 under_review→rejected | **Yes** (rejection verdict) | No | No | No | No |
| A6 accepted→frozen | No | No | **Yes** (founder or system) | No | No |
| A7 accepted→superseded | No | No | No | **Yes** (replacement) | No |
| A8 rejected→superseded | No | No | No | **Yes** (replacement) | No |

### 5.4 Orchestration & CRUD Rules

| Transition | Must go through Orchestration Module? | Must NEVER be triggered by direct CRUD update? |
|---|---|---|
| A1 created→classified | No | No |
| A2 classified→submitted | **Yes** | **Yes** |
| A3 submitted→under_review | **Yes** | **Yes** |
| A4 under_review→accepted | **Yes** | **Yes** |
| A5 under_review→rejected | **Yes** | **Yes** |
| A6 accepted→frozen | No | **Yes** |
| A7 accepted→superseded | **Yes** | **Yes** |
| A8 rejected→superseded | **Yes** | **Yes** |
| A9 frozen→archived | No | **Yes** |
| A10 accepted→archived | No | **Yes** |

---

## 6 — Review Transitions

### 6.1 Allowed Transitions Table

| # | from_state | to_state | required_conditions | side_effects | forbidden_if |
|---|---|---|---|---|---|
| V1 | `created` | `in_progress` | target artifact exists; reviewer_role_id active | emit `review.started` event | target artifact missing; reviewer role inactive |
| V2 | `in_progress` | `needs_clarification` | issue recorded (missing context documented) | emit `review.needs_clarification` event | no issue recorded |
| V3 | `needs_clarification` | `in_progress` | clarification supplied and linked | emit `review.clarification_received` event | clarification not provided |
| V4 | `in_progress` | `approved` | no blocking issues; verdict = approved | emit `review.approved` event; set verdict | blocking issues exist |
| V5 | `in_progress` | `approved_with_notes` | non-blocking notes recorded; verdict = approved_with_notes | emit `review.approved_with_notes` event; set verdict | blocking issues exist |
| V6 | `in_progress` | `rejected` | blocking issue found; rejection reason recorded; verdict = rejected | emit `review.rejected` event; set verdict | no rejection reason |
| V7 | `in_progress` | `escalated` | escalation reason recorded; verdict = escalated | emit `review.escalated` event; set verdict | no escalation reason |
| V8 | `approved` | `closed` | review finalized | emit `review.closed` event; set closed_at | none |
| V9 | `approved_with_notes` | `closed` | review finalized | emit `review.closed` event; set closed_at | none |
| V10 | `rejected` | `closed` | rejection finalized; rework path recorded | emit `review.closed` event; set closed_at | no rework path recorded |
| V11 | `escalated` | `closed` | founder decision recorded and linked | emit `review.closed` event; set closed_at | no founder decision |

### 6.2 Guard Pseudo-Code

```pseudo
function guardReviewTransition(review, to_state):

  ASSERT review.state != "closed"
    OR DENY "cannot transition from terminal state"

  if to_state == "in_progress":
    ASSERT review.state IN ["created", "needs_clarification"]
    ASSERT artifact_exists(review.artifact_id)
    ASSERT agent_role_active(review.reviewer_role_id)
    if review.state == "needs_clarification":
      ASSERT clarification_linked(review)
    RETURN ALLOW

  if to_state == "needs_clarification":
    ASSERT review.state == "in_progress"
    ASSERT issue_recorded(review)
    RETURN ALLOW

  if to_state == "approved":
    ASSERT review.state == "in_progress"
    ASSERT no_blocking_issues(review)
    RETURN ALLOW

  if to_state == "approved_with_notes":
    ASSERT review.state == "in_progress"
    ASSERT non_blocking_notes_recorded(review)
    ASSERT no_blocking_issues(review)
    RETURN ALLOW

  if to_state == "rejected":
    ASSERT review.state == "in_progress"
    ASSERT review.reason IS NOT NULL
    ASSERT blocking_issues_recorded(review)
    RETURN ALLOW

  if to_state == "escalated":
    ASSERT review.state == "in_progress"
    ASSERT escalation_reason_recorded(review)
    RETURN ALLOW

  if to_state == "closed":
    ASSERT review.state IN ["approved", "approved_with_notes", "rejected", "escalated"]
    if review.state == "rejected":
      ASSERT rework_path_recorded(review)
    if review.state == "escalated":
      ASSERT founder_decision_linked(review)
    RETURN ALLOW

  DENY "transition not allowed"
```

### 6.3 Cross-Entity Requirements

| Transition | Requires Artifact? | Requires Approval? | Requires Founder Decision? | Requires ContextPack? |
|---|---|---|---|---|
| V1 created→in_progress | **Yes** (target artifact) | No | No | No |
| V11 escalated→closed | No | No | **Yes** | No |

### 6.4 Orchestration & CRUD Rules

| Transition | Must go through Orchestration Module? | Must NEVER be triggered by direct CRUD update? |
|---|---|---|
| V1 created→in_progress | **Yes** | **Yes** |
| V2 in_progress→needs_clarification | No | **Yes** |
| V3 needs_clarification→in_progress | No | **Yes** |
| V4 in_progress→approved | **Yes** | **Yes** |
| V5 in_progress→approved_with_notes | **Yes** | **Yes** |
| V6 in_progress→rejected | **Yes** | **Yes** |
| V7 in_progress→escalated | **Yes** | **Yes** |
| V8 approved→closed | **Yes** | **Yes** |
| V9 approved_with_notes→closed | **Yes** | **Yes** |
| V10 rejected→closed | **Yes** | **Yes** |
| V11 escalated→closed | **Yes** | **Yes** |

---

## 7 — Approval Transitions

### 7.1 Allowed Transitions Table

| # | from_state | to_state | required_conditions | side_effects | forbidden_if |
|---|---|---|---|---|---|
| G1 | `pending` | `approved` | founder accepts; decision_note recorded; decided_at set | emit `approval.approved` event; set decided_at | actor is not founder; no decision recorded |
| G2 | `pending` | `rejected` | founder denies; reason recorded; decided_at set | emit `approval.rejected` event; set decided_at | actor is not founder; no reason |
| G3 | `pending` | `deferred` | founder postpones; follow-up note recorded | emit `approval.deferred` event | no follow-up note |
| G4 | `pending` | `expired` | request becomes obsolete; expiration_reason recorded | emit `approval.expired` event | no expiration reason |
| G5 | `approved` | `closed` | decision consumed by workflow; linked_action exists | emit `approval.closed` event; set closed_at | no linked action |
| G6 | `rejected` | `closed` | decision consumed by workflow; linked_action exists | emit `approval.closed` event; set closed_at | no linked action |
| G7 | `deferred` | `closed` | replaced by new approval request; replacement linked | emit `approval.closed` event; set closed_at | no replacement linked |
| G8 | `expired` | `closed` | finalization | emit `approval.closed` event; set closed_at | none |

### 7.2 Guard Pseudo-Code

```pseudo
function guardApprovalTransition(approval, to_state):

  ASSERT approval.state != "closed"
    OR DENY "cannot transition from terminal state"

  if to_state == "approved":
    ASSERT approval.state == "pending"
    ASSERT actor == FOUNDER
    ASSERT approval.founder_decision_note IS NOT NULL
    RETURN ALLOW

  if to_state == "rejected":
    ASSERT approval.state == "pending"
    ASSERT actor == FOUNDER
    ASSERT approval.founder_decision_note IS NOT NULL
    RETURN ALLOW

  if to_state == "deferred":
    ASSERT approval.state == "pending"
    ASSERT actor == FOUNDER
    ASSERT follow_up_note IS NOT NULL
    RETURN ALLOW

  if to_state == "expired":
    ASSERT approval.state == "pending"
    ASSERT expiration_reason IS NOT NULL
    RETURN ALLOW

  if to_state == "closed":
    ASSERT approval.state IN ["approved", "rejected", "deferred", "expired"]
    if approval.state IN ["approved", "rejected"]:
      ASSERT linked_action_exists(approval)
    if approval.state == "deferred":
      ASSERT replacement_approval_linked(approval)
    RETURN ALLOW

  DENY "transition not allowed"
```

### 7.3 Cross-Entity Requirements

| Transition | Requires Review? | Requires Founder Decision? | Requires Artifact? | Requires ContextPack? |
|---|---|---|---|---|
| G1 pending→approved | No | **Yes** | No | No |
| G2 pending→rejected | No | **Yes** | No | No |
| G3 pending→deferred | No | **Yes** | No | No |
| G5 approved→closed | No | No | No | No |
| G6 rejected→closed | No | No | No | No |

### 7.4 Orchestration & CRUD Rules

| Transition | Must go through Orchestration Module? | Must NEVER be triggered by direct CRUD update? |
|---|---|---|
| G1 pending→approved | No | **Yes** |
| G2 pending→rejected | No | **Yes** |
| G3 pending→deferred | No | **Yes** |
| G4 pending→expired | No | **Yes** |
| G5 approved→closed | **Yes** | **Yes** |
| G6 rejected→closed | **Yes** | **Yes** |
| G7 deferred→closed | **Yes** | **Yes** |
| G8 expired→closed | No | **Yes** |

---

## 8 — State Invariants (from doc 05 §14)

These invariants must hold at all times and must be enforced by guard logic:

1. Every task has exactly one current lifecycle state.
2. Every run has exactly one parent task.
3. Every artifact has a source task or source run.
4. Every review ends in a closed state.
5. A task in `done` cannot have unresolved blocking review.
6. A project in `completed` cannot have active critical tasks.
7. An approval in `pending` must have a known approver.
8. A run in `running` must have started from `preparing`.
9. A rejected artifact must not become canonical without replacement or override decision.
10. A closed project can only be changed through explicit reopen or new version workflow.

---

## 9 — Failure and Rework Loops (from doc 05 §12)

### 9.1 Run Failure Loop

```
run.failed OR run.timed_out
  → guardRunTransition(run, "finalized")
  → task remains in_progress OR task transitions to blocked
  → orchestrator decides: retry (new run), reassign, or escalate
```

### 9.2 Review Rejection Loop

```
artifact.state == "under_review"
  → guardReviewTransition(review, "rejected")
  → guardArtifactTransition(artifact, "rejected")
  → guardTaskTransition(task, "rework_required")
  → guardTaskTransition(task, "assigned")  // with rework notes
  → new run produces revised artifact
  → new review begins
```

### 9.3 Founder Escalation Loop

```
task.state == "escalated" OR review.state == "escalated"
  → founder decision recorded
  → guardTaskTransition(task, "assigned")  // with decision
  OR guardTaskTransition(task, "cancelled")
  OR guardReviewTransition(review, "closed")
```

---

## 10 — Summary of Orchestration-Mandatory Transitions

All transitions below MUST be executed through the Orchestration Module and must NEVER be performed by direct database UPDATE:

### Project
- P2 scoped→active
- P5 active→in_review
- P6 in_review→active
- P7 in_review→completed

### Task
- T2 ready→assigned
- T3 assigned→in_progress
- T4 in_progress→waiting_review
- T7 waiting_review→approved
- T8 waiting_review→rework_required
- T9 rework_required→assigned
- T10 blocked→assigned
- T11 escalated→assigned
- T12 approved→done
- T13 approved→assigned

### Run
- R1 created→preparing
- R2 preparing→running
- R4 running→produced_output
- R8 produced_output→finalized
- R9 failed→finalized
- R10 timed_out→finalized
- R12–R14 *→superseded

### Artifact
- A2 classified→submitted
- A3 submitted→under_review
- A4 under_review→accepted
- A5 under_review→rejected
- A7 accepted→superseded
- A8 rejected→superseded

### Review
- V1, V4–V11 (all except V2, V3)

### Approval
- G5 approved→closed
- G6 rejected→closed
- G7 deferred→closed

---

## 11 — Transitions Requiring Founder Decision

| Entity | Transition | Reason |
|---|---|---|
| Project | scoped→active | project activation |
| Project | in_review→active | rework decision |
| Project | in_review→completed | milestone/release acceptance |
| Task | escalated→assigned | escalation resolution |
| Task | any→cancelled | cancellation authority |
| Artifact | accepted→frozen | canonical lock |
| Review | escalated→closed | escalation resolution |
| Approval | pending→approved | approval authority |
| Approval | pending→rejected | rejection authority |
| Approval | pending→deferred | deferral authority |

---
layer: core
criticality: critical
enabled_in_production: yes
---

# Event Log Architecture

> Core Engine — Canonical append-only event log as single source of historical truth.

## 1 — Purpose

The `event_log` table is the **authoritative record** of every state transition and domain event in the system. It is append-only, immutable, and never stores derived state — only facts.

---

## 2 — Relationship: event_log vs outbox vs activity_events

| Concern | `event_log` | `outbox_events` | `activity_events` |
|---------|-------------|-----------------|-------------------|
| Role | **Source of truth** | Delivery channel | Projection (legacy) |
| Mutability | Append-only, immutable | Mutable (status updates) | Mutable |
| Purpose | Historical record & replay | Guarantee external delivery | Backward-compatible reads |
| Lifetime | Permanent | Until dispatched + retention | Permanent |
| Written in | Same transaction as state change | Same transaction | Same transaction |

**Key invariant:** If `event_log` and `activity_events` disagree, `event_log` wins.

---

## 3 — Schema

```
event_log
├── id                uuid PK
├── event_type        text NOT NULL        -- e.g. "task.assigned"
├── aggregate_type    text NOT NULL        -- e.g. "task"
├── aggregate_id      uuid NOT NULL        -- entity ID
├── payload_json      jsonb NOT NULL       -- event-specific data
├── correlation_id    uuid                 -- links related events
├── causation_id      uuid                 -- what caused this event
├── actor_type        text NOT NULL        -- system | founder | role
├── actor_ref         text                 -- role ID or identifier
├── idempotency_key   text                 -- prevents duplicate writes
└── created_at        timestamptz NOT NULL  -- immutable timestamp
```

### Constraints

- **No UPDATE trigger** — any attempt to update raises an exception
- **No DELETE trigger** — any attempt to delete raises an exception
- **Unique idempotency_key** — prevents duplicate event writes

---

## 4 — Complete Event Taxonomy

### 4.1 — Project Events

| Event | Trigger | Emitted By |
|-------|---------|-----------|
| `project.scoped` | Brief approved, project scoped | OrchestrationService |
| `project.active` | Founder approval, work begins | OrchestrationService |
| `project.blocked` | Blocker recorded | OrchestrationService |
| `project.in_review` | Milestone artifacts submitted | OrchestrationService |
| `project.paused` | Founder pauses project | OrchestrationService |
| `project.completed` | All tasks terminal, founder approved | OrchestrationService |
| `project.archived` | Founder archives | OrchestrationService |

### 4.2 — Task Events

| Event | Trigger | Emitted By |
|-------|---------|-----------|
| `task.ready` | Spec complete (title, goal, acceptance_criteria, requested_outcome, risk_class) | OrchestrationService |
| `task.assigned` | Owner role selected, handoff created | OrchestrationService |
| `task.in_progress` | Run starts, context available | OrchestrationService |
| `task.waiting_review` | Artifact submitted for review | OrchestrationService |
| `task.rework_required` | Review verdict = rejected | OrchestrationService |
| `task.validated` | Review verdict ∈ {approved, approved_with_notes} | OrchestrationService |
| `task.done` | All reviews closed, no pending approvals | OrchestrationService |
| `task.blocked` | Blocker recorded | OrchestrationService |
| `task.escalated` | Escalation reason recorded | OrchestrationService |
| `task.cancelled` | Founder cancels task | OrchestrationService |

### 4.3 — Run Events

| Event | Trigger | Emitted By |
|-------|---------|-----------|
| `run.preparing` | Task and agent exist, setup starts | OrchestrationService |
| `run.running` | Context pack available, execution started | OrchestrationService |
| `run.produced_output` | At least one artifact produced | OrchestrationService |
| `run.failed` | Execution error, failure reason recorded | OrchestrationService |
| `run.timed_out` | Runtime exceeded, timeout recorded | OrchestrationService |
| `run.cancelled` | Manual stop, cancellation recorded | OrchestrationService |
| `run.superseded` | Replacement run created | OrchestrationService |
| `run.finalized` | Outcome classification recorded | OrchestrationService |
| `run.stalled` | Heartbeat timeout detected (detection event, not lifecycle) | StalledRunDetector |

### 4.4 — Artifact Events

| Event | Trigger | Emitted By |
|-------|---------|-----------|
| `artifact.classified` | Source task/run exists, type assigned | OrchestrationService |
| `artifact.submitted` | Target review/consumer exists | OrchestrationService |
| `artifact.under_review` | Review record created | OrchestrationService |
| `artifact.accepted` | Review verdict ∈ {approved, approved_with_notes} | OrchestrationService |
| `artifact.rejected` | Review verdict = rejected | OrchestrationService |
| `artifact.frozen` | Freeze reason recorded (canonical lock) | OrchestrationService |
| `artifact.superseded` | Replacement artifact linked | OrchestrationService |
| `artifact.archived` | Archival reason recorded | OrchestrationService |

### 4.5 — Review Events

| Event | Trigger | Emitted By |
|-------|---------|-----------|
| `review.in_progress` | Target artifact exists, evaluation starts | OrchestrationService |
| `review.resolved` | Verdict set (approved/approved_with_notes/rejected/escalated) | OrchestrationService |
| `review.closed` | Review lifecycle complete | OrchestrationService |

### 4.6 — Approval Events

| Event | Trigger | Emitted By |
|-------|---------|-----------|
| `approval.decided` | Founder decision (approved/rejected/deferred) + note | OrchestrationService |
| `approval.expired` | Expiration reason recorded | OrchestrationService |
| `approval.closed` | Linked action exists, lifecycle complete | OrchestrationService |

### 4.7 — Handoff Events

| Event | Trigger | Emitted By |
|-------|---------|-----------|
| `handoff.created` | Role-to-role transfer initiated | HandoffService |
| `handoff.acknowledged` | Target role accepted | HandoffService |
| `handoff.completed` | Work finished successfully | HandoffService |
| `handoff.cancelled` | Task cancelled/reassigned | HandoffService |

### 4.8 — Delivery Events

| Event | Trigger | Emitted By |
|-------|---------|-----------|
| `workspace.created` | Repo workspace created for run | DeliverySpineService |
| `pull_request.opened` | PR created after validation | DeliverySpineService |
| `pull_request.merged` | PR merged to target branch | DeliverySpineService |
| `pull_request.closed` | PR closed without merge | DeliverySpineService |
| `ci.started` | Check suite started | DeliverySpineService |
| `ci.passed` | All checks passed | DeliverySpineService |
| `ci.failed` | Check suite failed | DeliverySpineService |
| `deployment.started` | Deploy initiated | DeliverySpineService |
| `deployment.live` | Deploy successful | DeliverySpineService |
| `deployment.failed` | Deploy failed | DeliverySpineService |
| `deployment.rolled_back` | Rollback executed | DeliverySpineService |
| `domain.bound` | Domain binding active | DeliverySpineService |
| `domain.misconfigured` | DNS/TLS verification failed | DeliverySpineService |

---

## 5 — Lifecycle → Event Coverage Matrix

### 5.1 — Guarantee: Every Lifecycle Transition Has a Corresponding Event

| Entity | Lifecycle States | Event Coverage |
|--------|-----------------|----------------|
| Project | draft → scoped → active → blocked/in_review/paused → completed → archived | ✅ All transitions emit `project.{toState}` |
| Task | draft → ready → assigned → in_progress → waiting_review → validated/rework_required → done/cancelled | ✅ All transitions emit `task.{toState}` |
| Run | created → preparing → running → produced_output/failed/timed_out/cancelled → finalized/superseded | ✅ All transitions emit `run.{toState}` |
| Artifact | created → classified → submitted → under_review → accepted/rejected → frozen/superseded → archived | ✅ All transitions emit `artifact.{toState}` |
| Review | created → in_progress → needs_clarification → resolved → closed | ✅ All transitions emit `review.{toState}` |
| Approval | pending → decided/expired → closed | ✅ All transitions emit `approval.{toState}` |
| Handoff | created → acknowledged → completed/cancelled | ✅ All transitions emit `handoff.{status}` |

### 5.2 — Non-Lifecycle Events (Detection / Domain Events)

| Event | Type | Emitter |
|-------|------|---------|
| `run.stalled` | Detection | StalledRunDetector |
| `workspace.created` | Domain | DeliverySpineService |
| `domain.bound` | Domain | DeliverySpineService |
| `domain.misconfigured` | Domain | DeliverySpineService |

These are NOT lifecycle state transitions but are recorded in `event_log` for complete audit trail.

---

## 6 — Correlation & Causation

### 6.1 — correlation_id

Links all events belonging to the same logical operation. Example: a single task execution produces events across Run, Artifact, Review — all share the same `correlation_id`.

### 6.2 — causation_id

Points to the specific event that directly caused this event. Forms a causal chain:

```
task.assigned (id: A)
  → run.preparing (causation_id: A, id: B)
    → run.running (causation_id: B, id: C)
      → run.produced_output (causation_id: C, id: D)
        → artifact.accepted (causation_id: D)
```

---

## 7 — Projection Rule

All UI surfaces (Office, Founder Dashboard, Client Portal) SHOULD read from projections derived from `event_log`, not by directly inferring transitions from entity state fields.

**Current projections:**
- `activity_events` — legacy projection, kept for backward compatibility
- Future: materialized views for dashboard aggregates

---

## 8 — Replay Potential

Because `event_log` is append-only and ordered by `created_at`, the full history of any aggregate can be reconstructed:

```sql
SELECT * FROM event_log
WHERE aggregate_type = 'task' AND aggregate_id = :id
ORDER BY created_at ASC;
```

This enables:
- **Audit trails** — complete history of every entity
- **Debugging** — replay exact sequence of events
- **Analytics** — compute metrics from raw event stream
- **Future event sourcing** — if needed, rebuild state from events

---

## 9 — Write Path

All event_log writes happen **inside the same database transaction** as the state change:

```
BEGIN TRANSACTION (Serializable)
  1. Read entity (optimistic lock check)
  2. Validate guard conditions
  3. Update entity state + version
  4. INSERT INTO event_log        ← authoritative
  5. INSERT INTO activity_events  ← projection
  6. INSERT INTO outbox_events    ← delivery
  7. INSERT INTO office_events    ← office (if task)
COMMIT
```

If the transaction fails, no event is written. If it succeeds, all event stores are consistent.

---

## 10 — Event Emitter Responsibility

| Service | Events Emitted |
|---------|---------------|
| OrchestrationService | All lifecycle state transitions (project, task, run, artifact, review, approval) |
| HandoffService | handoff.created, handoff.acknowledged, handoff.completed, handoff.cancelled |
| DeliverySpineService | workspace.created, pull_request.*, ci.*, deployment.*, domain.* |
| StalledRunDetector | run.stalled |

**Rule:** Every service that writes `activity_events` MUST also write `event_log` in the same transaction.

---

## 11 — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `core/03-state-machine.md` | event_log records all state transitions defined here |
| `core/05-guard-matrix.md` | Guards execute before events are written |
| `core/06-orchestration-use-cases.md` | Each UC produces one or more events |
| `core/13-operational-planes.md` | event_log is a Delivery Plane entity |
| `delivery/delivery-lane.md` | Delivery events tracked in log |
| `00-system-overview.md` | Event log is Core Engine primitive |

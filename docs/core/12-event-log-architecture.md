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

## 4 — Event Taxonomy

### 4.1 — Project Events

| Event | Trigger |
|-------|---------|
| `project.created` | Project entity created |
| `project.activated` | Blueprint approved, work begins |
| `project.completed` | All milestones done |

### 4.2 — Task Events

| Event | Trigger |
|-------|---------|
| `task.created` | Task decomposed from project |
| `task.assigned` | Agent role assigned |
| `task.validated` | Output verified |
| `task.done` | Task fully complete |
| `task.blocked` | Dependency or resource block |
| `task.escalated` | Escalated to founder |

### 4.3 — Run Events

| Event | Trigger |
|-------|---------|
| `run.created` | Run entity created |
| `run.preparing` | Context pack assembled |
| `run.running` | Provider execution started |
| `run.produced_output` | Output received |
| `run.failed` | Execution error |
| `run.stalled` | Heartbeat timeout |

### 4.4 — Review Events

| Event | Trigger |
|-------|---------|
| `review.created` | Review requested |
| `review.resolved` | Verdict rendered |
| `review.closed` | Review lifecycle complete |

### 4.5 — Approval Events

| Event | Trigger |
|-------|---------|
| `approval.created` | Approval requested |
| `approval.decided` | Founder decision made |
| `approval.closed` | Approval lifecycle complete |

### 4.6 — Handoff Events

| Event | Trigger |
|-------|---------|
| `handoff.created` | Role-to-role transfer initiated |
| `handoff.acknowledged` | Target role accepted |
| `handoff.completed` | Handoff closed |

### 4.7 — Delivery Events

| Event | Trigger |
|-------|---------|
| `pull_request.opened` | PR created |
| `pull_request.merged` | PR merged to target branch |
| `ci.started` | Check suite started |
| `ci.passed` | All checks passed |
| `ci.failed` | Check suite failed |
| `deployment.started` | Deploy initiated |
| `deployment.live` | Deploy successful |
| `deployment.failed` | Deploy failed |
| `deployment.rolled_back` | Rollback executed |

---

## 5 — Correlation & Causation

### 5.1 — correlation_id

Links all events belonging to the same logical operation. Example: a single task execution produces events across Run, Artifact, Review — all share the same `correlation_id`.

### 5.2 — causation_id

Points to the specific event that directly caused this event. Forms a causal chain:

```
task.assigned (id: A)
  → run.created (causation_id: A, id: B)
    → run.running (causation_id: B, id: C)
      → run.produced_output (causation_id: C)
```

---

## 6 — Projection Rule

All UI surfaces (Office, Founder Dashboard, Client Portal) SHOULD read from projections derived from `event_log`, not by directly inferring transitions from entity state fields.

**Current projections:**
- `activity_events` — legacy projection, kept for backward compatibility
- Future: materialized views for dashboard aggregates

---

## 7 — Replay Potential

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

## 8 — Write Path

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

If the transaction fails, no event is written. If it succeeds, all three event stores are consistent.

---

## 9 — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `core/03-state-machine.md` | event_log records all state transitions |
| `core/06-orchestration-use-cases.md` | Each UC produces events |
| `delivery/delivery-lane.md` | Delivery events tracked in log |
| `00-system-overview.md` | Event log is Core Engine primitive |

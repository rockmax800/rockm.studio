# 14 — Data Model V1

## 1 — Purpose

This document defines the initial data model for AI Workshop OS.

The goal of this model is to support:

- project control
- task orchestration
- isolated execution runs
- artifact storage
- review workflows
- founder approvals
- agent role management
- document traceability

This model is intentionally minimal.

It supports V1 internal use for a single founder and does not include:

- external users
- billing
- multi-tenant isolation
- production deployment records
- advanced memory systems

---

## 2 — Modeling Principles

### 2.1 Separate planning from execution

A Task is not a Run.
A Run is not an Artifact.
A Review is not an Approval.

### 2.2 Store traceability explicitly

The system must preserve links between:

- project
- task
- run
- artifact
- review
- approval
- document
- agent role

### 2.3 Optimize for inspectability

The founder must be able to reconstruct:

- what happened
- who owned it
- what was produced
- what failed
- what was approved

### 2.4 Support bounded growth

The model should start small but allow later extension.

---

## 3 — Core Entities

V1 core entities:

- Project
- Document
- AgentRole
- Task
- ContextPack
- Run
- Artifact
- Review
- Approval
- ActivityEvent

Optional later:

- Skill
- ReferenceExample
- GitHubLink
- Notification
- VoiceSession

---

## 4 — Entity Overview

| Entity | Purpose |
|---|---|
| Project | top-level container for work |
| Document | canonical or supporting project docs |
| AgentRole | role definition and permissions surface |
| Task | unit of work |
| ContextPack | scoped task context |
| Run | one execution attempt |
| Artifact | output produced by task or run |
| Review | formal validation record |
| Approval | founder decision record |
| ActivityEvent | audit and timeline event |

---

## 5 — Project

## 5.1 Purpose

Represents one internal product initiative or delivery stream.

## 5.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| name | string | yes | project name |
| slug | string | yes | unique project key |
| purpose | text | yes | short project intent |
| project_type | string | no | dashboard, internal tool, app, etc |
| current_phase | string | no | discovery, docs, frontend, backend, review |
| state | enum | yes | draft, scoped, active, blocked, paused, completed, archived |
| founder_notes | text | no | optional notes |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| archived_at | timestamp | no | |

## 5.3 Relationships

- one Project has many Documents
- one Project has many Tasks
- one Project has many Runs through Tasks
- one Project has many Artifacts
- one Project has many Reviews
- one Project has many Approvals
- one Project has many ActivityEvents

---

## 6 — Document

## 6.1 Purpose

Stores canonical or supporting markdown documents.

## 6.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| project_id | uuid | yes | FK to Project |
| title | string | yes | display title |
| file_path | string | yes | e.g. `docs/04-domain-boundaries.md` |
| doc_type | enum | yes | brief, domain, lifecycle, collaboration, ui_spec, other |
| status | enum | yes | draft, active, canonical, superseded, archived |
| version_label | string | no | optional version marker |
| content_markdown | text | yes | markdown body |
| source_task_id | uuid | no | task that created or changed it |
| source_artifact_id | uuid | no | artifact source if applicable |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

## 6.3 Notes

In V1, markdown content can live directly in the DB.
Later it can sync to GitHub files.

---

## 7 — AgentRole

## 7.1 Purpose

Represents a named operating role, not a person account.

## 7.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| name | string | yes | unique role name |
| code | string | yes | e.g. `backend_implementer` |
| description | text | yes | role purpose |
| status | enum | yes | active, inactive |
| allowed_domains | jsonb | no | list of allowed domains |
| allowed_actions | jsonb | no | list of allowed actions |
| forbidden_actions | jsonb | no | list of forbidden actions |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

## 7.3 Initial Seed Roles

- product_strategist
- solution_architect
- frontend_builder
- backend_architect
- backend_implementer
- reviewer
- qa_agent
- release_coordinator

---

## 8 — Task

## 8.1 Purpose

Represents a unit of work owned by one role at a time.

## 8.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| project_id | uuid | yes | FK to Project |
| parent_task_id | uuid | no | self-reference for subtask support |
| title | string | yes | task title |
| purpose | text | yes | what this task is for |
| domain | enum | yes | founder_control, docs, orchestration, frontend, backend, review, qa, release |
| owner_role_id | uuid | no | FK to AgentRole |
| expected_output_type | enum | yes | document, frontend, backend, schema, review, approval_packet, test, release |
| state | enum | yes | draft, ready, assigned, in_progress, waiting_review, rework_required, blocked, escalated, approved, done, cancelled |
| priority | enum | yes | low, medium, high, critical |
| urgency | enum | no | normal, high, blocker |
| acceptance_criteria | jsonb | yes | structured list |
| constraints | jsonb | no | structured rules |
| blocker_reason | text | no | only if blocked |
| escalation_reason | text | no | only if escalated |
| requested_outcome | string | no | implementation, review, clarification, etc |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| closed_at | timestamp | no | |

## 8.3 Notes

Use `acceptance_criteria` as structured JSON array from day one.
Do not bury it inside long text only.

---

## 9 — ContextPack

## 9.1 Purpose

Represents scoped context assembled for a task or run.

## 9.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| project_id | uuid | yes | FK to Project |
| task_id | uuid | yes | FK to Task |
| summary | text | no | short explanation of included context |
| included_document_ids | jsonb | no | list of Document ids |
| included_artifact_ids | jsonb | no | list of Artifact ids |
| included_file_paths | jsonb | no | list of repo paths |
| assumptions | jsonb | no | assumptions carried into execution |
| missing_context_notes | text | no | if context is incomplete |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

## 9.3 Notes

V1 can store arrays in JSONB for speed.
Later this can normalize further if needed.

---

## 10 — Run

## 10.1 Purpose

Represents one isolated execution attempt against one task.

## 10.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| project_id | uuid | yes | FK to Project |
| task_id | uuid | yes | FK to Task |
| agent_role_id | uuid | yes | FK to AgentRole |
| context_pack_id | uuid | no | FK to ContextPack |
| state | enum | yes | created, preparing, running, produced_output, failed, timed_out, cancelled, superseded, finalized |
| run_number | integer | yes | sequence within task |
| started_at | timestamp | no | |
| ended_at | timestamp | no | |
| duration_ms | integer | no | |
| status_summary | text | no | short run summary |
| failure_reason | text | no | if failed |
| output_summary | text | no | summary of outputs |
| retry_of_run_id | uuid | no | self-reference |
| superseded_by_run_id | uuid | no | self-reference |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

## 10.3 Notes

One task may have many runs.
`run_number` should be unique per task.

---

## 11 — Artifact

## 11.1 Purpose

Represents a meaningful output from a task or run.

## 11.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| project_id | uuid | yes | FK to Project |
| task_id | uuid | no | FK to Task |
| run_id | uuid | no | FK to Run |
| artifact_type | enum | yes | document, architecture, frontend, backend, schema, test, review, release |
| title | string | yes | artifact title |
| state | enum | yes | created, classified, submitted, under_review, accepted, rejected, superseded, frozen, archived |
| storage_kind | enum | yes | db_text, file_path, github_ref, external |
| content_text | text | no | for markdown or small text outputs |
| file_path | string | no | repo-relative path |
| external_ref | string | no | optional external link or identifier |
| summary | text | no | artifact description |
| canonical_flag | boolean | yes | default false |
| supersedes_artifact_id | uuid | no | self-reference |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

## 11.3 Invariant

At least one of `task_id` or `run_id` must exist.

---

## 12 — Review

## 12.1 Purpose

Formal validation record for one artifact or task output.

## 12.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| project_id | uuid | yes | FK to Project |
| task_id | uuid | no | FK to Task |
| artifact_id | uuid | yes | FK to Artifact |
| reviewer_role_id | uuid | yes | FK to AgentRole |
| state | enum | yes | created, in_progress, needs_clarification, approved, approved_with_notes, rejected, escalated, closed |
| verdict | enum | no | approved, approved_with_notes, rejected, escalated |
| reason | text | no | summary of verdict |
| blocking_issues | jsonb | no | structured issues |
| non_blocking_notes | jsonb | no | optional notes |
| suggested_next_step | text | no | |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| closed_at | timestamp | no | |

## 12.3 Notes

`state` and `verdict` are related but not identical.
A review becomes terminal when `state = closed`.

---

## 13 — Approval

## 13.1 Purpose

Represents a founder approval request and decision.

## 13.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| project_id | uuid | yes | FK to Project |
| approval_type | enum | yes | project_activation, architecture, schema, scope_change, release, cancellation |
| target_type | enum | yes | project, task, artifact, review, document |
| target_id | uuid | yes | referenced object id |
| requested_by_role_id | uuid | no | FK to AgentRole |
| state | enum | yes | pending, approved, rejected, deferred, expired, closed |
| summary | text | yes | decision request summary |
| recommendation | text | no | recommended action |
| consequence_if_approved | text | no | |
| consequence_if_rejected | text | no | |
| founder_decision_note | text | no | |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| decided_at | timestamp | no | |
| closed_at | timestamp | no | |

## 13.3 Notes

V1 assumes one founder approver, so no separate approver user table is needed yet.

---

## 14 — ActivityEvent

## 14.1 Purpose

Provides traceability and timeline history across the system.

## 14.2 Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | yes | primary key |
| project_id | uuid | yes | FK to Project |
| entity_type | enum | yes | project, document, task, context_pack, run, artifact, review, approval |
| entity_id | uuid | yes | referenced object id |
| event_type | string | yes | e.g. `task_created`, `run_failed`, `review_rejected` |
| actor_type | enum | yes | founder, system, agent_role |
| actor_role_id | uuid | no | FK to AgentRole if relevant |
| event_payload | jsonb | no | structured details |
| created_at | timestamp | yes | |

## 14.3 Notes

This table powers:

- project activity timeline
- audit visibility
- debugging
- founder overview feed

---

## 15 — Entity Relationship Summary

## 15.1 Main Relationships

- Project 1:N Document
- Project 1:N Task
- Project 1:N ContextPack
- Project 1:N Run
- Project 1:N Artifact
- Project 1:N Review
- Project 1:N Approval
- Project 1:N ActivityEvent
- AgentRole 1:N Task
- AgentRole 1:N Run
- AgentRole 1:N Review
- AgentRole 1:N Approval as requester
- Task 1:N ContextPack
- Task 1:N Run
- Task 1:N Artifact
- Task 1:N Review
- Run 1:N Artifact
- Artifact 1:N Review

---

## 16 — Suggested Enums

## 16.1 project_state

- draft
- scoped
- active
- blocked
- in_review
- paused
- completed
- archived

## 16.2 task_state

- draft
- ready
- assigned
- in_progress
- waiting_review
- rework_required
- blocked
- escalated
- approved
- done
- cancelled

## 16.3 run_state

- created
- preparing
- running
- produced_output
- failed
- timed_out
- cancelled
- superseded
- finalized

## 16.4 artifact_state

- created
- classified
- submitted
- under_review
- accepted
- rejected
- superseded
- frozen
- archived

## 16.5 review_state

- created
- in_progress
- needs_clarification
- approved
- approved_with_notes
- rejected
- escalated
- closed

## 16.6 review_verdict

- approved
- approved_with_notes
- rejected
- escalated

## 16.7 approval_state

- pending
- approved
- rejected
- deferred
- expired
- closed

---

## 17 — Minimal Invariants

The following invariants must hold:

1. every Task belongs to exactly one Project
2. every Run belongs to exactly one Task
3. every Run belongs to exactly one Project
4. every Review belongs to exactly one Artifact
5. every Approval references one target object
6. every ActivityEvent references one object and one project
7. a Task in `done` must not have unresolved blocking review
8. an Artifact must have a source Task or source Run
9. `run_number` must be unique within a Task
10. canonical documents or artifacts must not be silently overwritten

---

## 18 — Founder-Critical Queries

The data model must support these questions easily:

### Dashboard

- which tasks are blocked
- which approvals are pending
- which runs failed recently
- which reviews were rejected
- which projects need founder attention

### Project Detail

- what is the current state of this project
- what tasks are active
- what artifacts were produced recently
- what is waiting for review
- what approvals are open

### Task Detail

- who owns this task
- what runs happened
- what artifacts came out
- what review happened
- what is the next step

### Approval Detail

- what decision is being requested
- why
- what artifacts support it
- what happens if approved or rejected

---

## 19 — V1 Simplifications

For V1, we intentionally simplify:

### No User table

Only one founder exists operationally.
Agent roles are system roles, not user identities.

### No Skill table yet

Skills can live inside `AgentRole` metadata or docs for now.

### No full GitHub object model

GitHub linkage can be stored later as artifact refs or metadata.

### No separate notification system

Use activity events and dashboard first.

### No polymorphic relational engine

Use `target_type + target_id` in approvals for simplicity.

---

## 20 — Suggested PostgreSQL Table Names

- projects
- documents
- agent_roles
- tasks
- context_packs
- runs
- artifacts
- reviews
- approvals
- activity_events

---

## 21 — Suggested Indexes

Create indexes on:

- projects.state
- tasks.project_id
- tasks.state
- tasks.owner_role_id
- runs.task_id
- runs.state
- artifacts.project_id
- artifacts.task_id
- artifacts.run_id
- artifacts.state
- reviews.artifact_id
- reviews.state
- approvals.project_id
- approvals.state
- activity_events.project_id
- activity_events.entity_type, activity_events.entity_id
- documents.project_id
- documents.file_path

---

## 22 — Initial Seed Data

Seed these on first setup:

### Agent roles

- Product Strategist
- Solution Architect
- Frontend Builder
- Backend Architect
- Backend Implementer
- Reviewer
- QA Agent
- Release Coordinator

### System documents

For a new project, pre-create placeholders for:

- `docs/00-project-brief.md`
- `docs/04-domain-boundaries.md`
- `docs/05-lifecycle-state-machine.md`
- `docs/11-ai-agent-instructions.md`
- `docs/12-ai-collaboration-protocol.md`
- `docs/13-lovable-ui-spec-v1.md`
- `docs/14-data-model-v1.md`

---

## 23 — Open Extensions for V2

Possible future additions:

- skills
- reference examples
- github pull requests
- github checks
- notifications
- memory snapshots
- command executions
- deployment records
- voice sessions
- multi-founder or operator accounts

---

## 24 — Implementation Note

This model is designed for PostgreSQL.

Recommended implementation path:

- relational core tables
- enums for lifecycle state
- JSONB for flexible structured fields
- UUID primary keys
- explicit foreign keys
- append-only activity events where possible

---

## 25 — Final Modeling Rule

If a system event matters to founder visibility, reviewability, or recovery, it must be stored as a first-class record.
# 04 — Data Model

> Layer 1 — Core Engine

## 1 — Purpose

Defines the core data model supporting project control, task orchestration, execution runs, artifact storage, review workflows, and founder approvals.

---

## 2 — Core Entities

| Entity | Purpose |
|--------|---------|
| Project | Top-level container for work |
| Document | Canonical or supporting project docs |
| AgentRole | Role definition and permissions surface |
| Task | Unit of work |
| ContextPack | Scoped task context |
| Run | One execution attempt |
| Artifact | Output produced by task or run |
| Review | Formal validation record |
| Approval | Founder decision record |
| ActivityEvent | Audit and timeline event |

---

## 3 — Project

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| name | string | yes | |
| slug | string | yes | Unique |
| purpose | text | yes | |
| project_type | string | no | |
| current_phase | string | no | |
| state | enum | yes | project_state |
| team_id | uuid | no | FK to teams |
| founder_notes | text | no | |
| version | integer | yes | Optimistic locking |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| archived_at | timestamp | no | |

---

## 4 — Document

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| title | string | yes | |
| file_path | string | yes | |
| doc_type | enum | yes | brief, domain, lifecycle, collaboration, ui_spec, other |
| status | enum | yes | draft, active, canonical, superseded, archived |
| version_label | string | no | |
| content_markdown | text | yes | |
| source_task_id | uuid | no | FK |
| source_artifact_id | uuid | no | FK |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

---

## 5 — AgentRole

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| name | string | yes | Unique role name |
| code | string | yes | e.g. `backend_implementer` |
| description | text | yes | |
| status | enum | yes | active, inactive |
| allowed_domains | jsonb | no | |
| allowed_actions | jsonb | no | |
| forbidden_actions | jsonb | no | |
| skill_profile | jsonb | no | |
| model_preference | jsonb | no | |
| prompt_template | text | no | |
| team_id | uuid | no | FK (Layer 2) |
| capacity_score | numeric | yes | Default 1.0 |
| performance_score | numeric | yes | Default 0.5 |
| success_rate | numeric | yes | Default 0.0 |
| total_runs | integer | yes | Default 0 |
| max_parallel_tasks | integer | yes | Default 3 |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

---

## 6 — Task

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| parent_task_id | uuid | no | Self-reference |
| title | string | yes | |
| purpose | text | yes | |
| domain | enum | yes | |
| owner_role_id | uuid | no | FK to AgentRole |
| expected_output_type | enum | yes | |
| state | enum | yes | task_state |
| priority | enum | yes | |
| acceptance_criteria | jsonb | yes | Structured list |
| constraints | jsonb | no | |
| blocker_reason | text | no | |
| escalation_reason | text | no | |
| requested_outcome | string | no | |
| version | integer | yes | Optimistic locking |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| closed_at | timestamp | no | |

---

## 7 — ContextPack

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| task_id | uuid | yes | FK |
| summary | text | no | |
| included_document_ids | jsonb | no | |
| included_artifact_ids | jsonb | no | |
| included_file_paths | jsonb | no | |
| assumptions | jsonb | no | |
| missing_context_notes | text | no | |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

---

## 8 — Run

### 8.1 Core Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| task_id | uuid | yes | FK |
| agent_role_id | uuid | yes | FK |
| context_pack_id | uuid | no | FK |
| state | enum | yes | run_state |
| run_number | integer | yes | Unique per task |
| started_at | timestamp | no | |
| ended_at | timestamp | no | |
| duration_ms | integer | no | Computed on completion |
| status_summary | text | no | |
| failure_reason | text | no | |
| output_summary | text | no | |
| retry_of_run_id | uuid | no | Self-reference |
| superseded_by_run_id | uuid | no | Self-reference |
| version | integer | yes | Optimistic locking |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

### 8.2 Execution Context (v2.2)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| provider_id | uuid | no | FK providers — set when entering `running` |
| provider_model_id | uuid | no | FK provider_models — set when entering `running` |
| prompt_version_ref | uuid | no | FK prompt_versions |
| skill_pack_version_ref | text | no | Version identifier for skill pack |
| tool_policy_ref | text | no | Policy identifier for tool access |

### 8.3 Workspace & Code (v2.2)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| workspace_id | uuid | no | FK repo_workspaces — linked post-creation |
| branch_name | text | no | Copied from workspace |
| commit_sha | text | no | Final commit hash |

### 8.4 Execution Control (v2.2)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| lease_owner | text | no | Executor instance ID |
| heartbeat_at | timestamp | no | Last heartbeat from executor |
| retry_class | text | no | Classification for retry logic |
| error_class | text | no | Error classification on failure |
| exit_code | integer | no | Executor exit code |

### 8.5 Cost & Usage (v2.2)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| input_tokens | integer | no | Tokens sent to provider |
| output_tokens | integer | no | Tokens received from provider |
| estimated_cost | decimal | no | USD cost estimate |

### 8.6 Observability (v2.2)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| logs_ref | text | no | Reference to execution logs |
| correlation_id | uuid | no | Propagated across handoff → run → PR → deployment |
| causation_id | uuid | no | ID of the run that caused this retry |
| idempotency_key | text | no | Unique key = task_id + run_number |

### 8.7 Execution Trace Invariants

1. `provider_id` + `provider_model_id` must be set when run enters `running`
2. `input_tokens` + `output_tokens` must be stored after execution completes
3. `correlation_id` propagates across handoff → run → PR → deployment
4. `idempotency_key` prevents duplicate execution (unique index)
5. `heartbeat_at` enables stalled run detection (soft flag, no auto-transition)
6. `error_class` is set on failure for retry classification

---

## 9 — Artifact

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| task_id | uuid | no | FK |
| run_id | uuid | no | FK |
| artifact_type | enum | yes | |
| title | string | yes | |
| state | enum | yes | artifact_state |
| storage_kind | enum | yes | db_text, file_path, github_ref, external |
| content_text | text | no | |
| file_path | string | no | |
| external_ref | string | no | |
| summary | text | no | |
| canonical_flag | boolean | yes | Default false |
| supersedes_artifact_id | uuid | no | Self-reference |
| version | integer | yes | |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

**Invariant:** At least one of `task_id` or `run_id` must exist.

---

## 10 — Review

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| task_id | uuid | no | FK |
| artifact_id | uuid | yes | FK |
| reviewer_role_id | uuid | yes | FK |
| state | enum | yes | review_state |
| verdict | enum | no | approved, approved_with_notes, rejected, escalated |
| reason | text | no | |
| blocking_issues | jsonb | no | |
| non_blocking_notes | jsonb | no | |
| suggested_next_step | text | no | |
| version | integer | yes | |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| closed_at | timestamp | no | |

---

## 11 — Approval

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| approval_type | enum | yes | |
| target_type | enum | yes | project, task, artifact, review, document |
| target_id | uuid | yes | |
| requested_by_role_id | uuid | no | FK |
| state | enum | yes | approval_state |
| summary | text | yes | |
| recommendation | text | no | |
| consequence_if_approved | text | no | |
| consequence_if_rejected | text | no | |
| founder_decision_note | text | no | |
| version | integer | yes | |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |
| decided_at | timestamp | no | |
| closed_at | timestamp | no | |

---

## 12 — ActivityEvent

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| entity_type | enum | yes | |
| entity_id | uuid | yes | |
| event_type | string | yes | e.g. `task.assigned`, `run.failed` |
| actor_type | enum | yes | founder, system, agent_role |
| actor_role_id | uuid | no | FK |
| event_payload | jsonb | no | |
| created_at | timestamp | yes | |

**Rules:** Append-only. Powers project timeline, audit, debugging, founder feed.

---

## 13 — Entity Relationships

- Project 1:N Document, Task, Run, Artifact, Review, Approval, ActivityEvent
- AgentRole 1:N Task, Run, Review
- Task 1:N ContextPack, Run, Artifact, Review
- Run 1:N Artifact
- Artifact 1:N Review

---

## 14 — Delivery Spine Entities

> Additive layer for code, CI, and deployment lifecycle.
> All entities trace back to Project → Task → Run.

### 14.1 Repository

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| provider | enum | yes | github, gitea, gitlab, other |
| repo_owner | text | yes | |
| repo_name | text | yes | |
| default_branch | text | yes | Default: main |
| status | enum | yes | active, archived |
| created_at | timestamp | yes | |

**Invariant:** (repo_owner, repo_name) is unique.

### 14.2 RepoWorkspace

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| task_id | uuid | yes | FK |
| run_id | uuid | yes | FK |
| repository_id | uuid | yes | FK |
| branch_name | text | yes | |
| worktree_path | text | no | |
| head_sha | text | no | |
| sandbox_mode | enum | yes | isolated, host |
| status | enum | yes | created, active, merged, discarded |
| created_at | timestamp | yes | |
| released_at | timestamp | no | |

**Invariant:** Each code-producing run creates exactly one workspace.

### 14.3 PullRequest

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| task_id | uuid | yes | FK |
| run_id | uuid | yes | FK |
| repository_id | uuid | yes | FK |
| pr_number | integer | no | Set when actual PR created |
| source_branch | text | yes | |
| target_branch | text | yes | |
| title | text | yes | |
| status | enum | yes | opened, merged, closed |
| opened_at | timestamp | yes | |
| merged_at | timestamp | no | |
| closed_at | timestamp | no | |

**Traceability:** Every PR must reference project_id, task_id, run_id.

### 14.4 CheckSuite

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| task_id | uuid | yes | FK |
| pull_request_id | uuid | yes | FK |
| provider | enum | yes | github_actions, other |
| external_run_ref | text | no | |
| status | enum | yes | queued, running, passed, failed |
| summary | text | no | |
| logs_ref | text | no | |
| started_at | timestamp | no | |
| finished_at | timestamp | no | |

### 14.5 Deployment

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| environment | enum | yes | staging, production, preview |
| source_type | enum | yes | branch, pr, tag |
| source_ref | text | yes | |
| version_label | text | no | |
| status | enum | yes | pending, deploying, live, failed, rolled_back |
| preview_url | text | no | |
| logs_ref | text | no | |
| started_at | timestamp | no | |
| finished_at | timestamp | no | |
| rollback_of_deployment_id | uuid | no | Self-reference |

### 14.6 DomainBinding

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| project_id | uuid | yes | FK |
| environment | enum | yes | staging, production, preview |
| domain | text | yes | Unique |
| dns_status | text | yes | |
| tls_status | text | yes | |
| target_type | enum | yes | ip, cname, platform |
| target_value | text | yes | |
| healthcheck_url | text | no | |
| status | enum | yes | active, misconfigured, pending |

---

## 15 — Delivery Spine Relationships

- Project 1:N Repository, Deployment, DomainBinding
- Repository 1:N RepoWorkspace, PullRequest
- Run 1:1 RepoWorkspace (for code-producing runs)
- Task 1:N PullRequest (via runs)
- PullRequest 1:N CheckSuite

---

## 16 — Outbox Events (v2.3)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | yes | PK |
| aggregate_type | text | yes | project, task, run, review, approval, handoff, deployment |
| aggregate_id | uuid | yes | Entity that changed |
| event_type | text | yes | e.g. `run.running`, `task.in_progress` |
| payload_json | jsonb | yes | Full event context |
| correlation_id | uuid | no | Traces across handoff → run → PR → deployment |
| causation_id | uuid | no | Event that triggered this one |
| idempotency_key | text | no | Unique — prevents duplicate dispatch |
| status | text | yes | pending, dispatched, failed |
| retry_count | integer | yes | Default 0, max 5 |
| created_at | timestamp | yes | Written in same transaction as state change |
| dispatched_at | timestamp | no | Set when successfully dispatched |

### 16.1 Outbox Invariants

1. Outbox row is written **inside the same transaction** as the state change
2. Dispatch is asynchronous — poll-based, not inline
3. `idempotency_key` prevents duplicate events for the same transition
4. Failed events retry up to 5 times before marking as `failed`
5. Events are never deleted — append-only for auditability

---

## 17 — Lease Model for Run Execution (v2.3)

Run execution uses a lease-based model to prevent concurrent execution:

| Field | Type | Notes |
|-------|------|-------|
| lease_owner | text | Executor instance identifier |
| lease_acquired_at | timestamp | When lease was acquired |
| lease_expires_at | timestamp | Lease auto-expires after this time |
| heartbeat_at | timestamp | Refreshed periodically during execution |

### 17.1 Lease Rules

1. Before executing, executor must **acquire lease** (set `lease_owner` + `lease_expires_at`)
2. If lease is held and not expired → abort (another executor owns it)
3. If lease is expired (`now > lease_expires_at`) → lease can be reclaimed
4. Heartbeat extends lease during long-running execution
5. Stalled detection: `state=running AND heartbeat_at < threshold` → soft flag, no auto-transition

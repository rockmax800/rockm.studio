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
| duration_ms | integer | no | |
| status_summary | text | no | |
| failure_reason | text | no | |
| output_summary | text | no | |
| retry_of_run_id | uuid | no | Self-reference |
| superseded_by_run_id | uuid | no | Self-reference |
| version | integer | yes | Optimistic locking |
| created_at | timestamp | yes | |
| updated_at | timestamp | yes | |

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

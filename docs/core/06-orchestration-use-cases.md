---
doc_kind: contract
load_strategy: retrieve
layer: core
criticality: critical
---

# 06 — Orchestration Use Cases

> Layer 1 — Core Engine

## 1 — Purpose

Defines the 26 atomic workflow actions that coordinate entity state transitions.
Each use case is owned by OrchestrationService and delegates to entity services.

---

## 2 — Use Case Index

| # | Use Case | Sync/Async | Founder? | Provider? |
|---|----------|------------|----------|-----------|
| UC-01 | Activate Project | sync | **yes** | no |
| UC-02 | Assign Task | sync | no | no |
| UC-03 | Start Run | async | no | no |
| UC-04 | Complete Run | async | no | no |
| UC-05 | Submit Artifact for Review | sync | no | no |
| UC-06 | Resolve Review (set verdict) | sync | no | no |
| UC-07 | ~~Resolve Review — Reject~~ | *(merged into UC-06)* | — | — |
| UC-08 | ~~Resolve Review — Escalate~~ | *(merged into UC-06)* | — | — |
| UC-09 | Request Approval | sync | no | no |
| UC-10 | Resolve Approval (set decision) | sync | **yes** | no |
| UC-11 | Complete Task | sync | no | no |
| UC-12 | Complete Project Milestone | sync | **yes** | no |
| UC-13 | Execute Agent Run | async | no | **yes** |
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

## 2.1 — UC-06/07/08 Merge Note (v2.1)

Old UC-06 (Approve), UC-07 (Reject), UC-08 (Escalate) are now a single UC-06 (Resolve Review):

**Before:** Three separate use cases each transitioning review.state to a verdict-like value.
**After:** One use case that:
1. Sets `review.verdict` to the appropriate value (approved/rejected/escalated/approved_with_notes)
2. Transitions `review.state` from `in_progress` → `resolved`
3. Cascades to task/artifact based on `verdict` value

**UC-10 Resolve Approval** similarly:
1. Sets `approval.decision` to the appropriate value (approved/rejected/deferred)
2. Transitions `approval.state` from `pending` → `decided`

---

## 3 — Transaction Scope

Each use case runs inside ONE Prisma interactive transaction with Serializable isolation.

| Use Case | Transaction Includes |
|----------|---------------------|
| UC-01 | Read Approval + Read Documents + Update Project |
| UC-03 | Create Run (with correlation_id, idempotency_key) + Update Task + Read ContextPack + **Assemble context snapshot (v2.4)** + **Validate RoleContract domain (v3.0)** + Read AgentRole |
| UC-04 | Update Run (store provider refs, tokens, cost, workspace link) + **Validate changed files against RoleContract (v3.0)** + Create/Update Artifact(s) **with artifact_category + evidence fields (v3.0)** |
| UC-05 | Update Artifact (×2) + **Validate artifact_category contract (v3.0)** + Create Review + Update Review + Update Task |
| UC-06 | Update Review (set verdict + state→resolved) + Update Artifact + Update Task |
| UC-10 | Update Approval (set decision + state→decided) |
| UC-11 | Update Task (validated→done) + Update Approval(s) (decided→closed) |
| UC-12 | Update Project + Update Approval (decided→closed) |
| UC-13 | Update Run (set lease_owner, heartbeat_at, started_at, provider_id, provider_model_id) |
| UC-14 | Update Run (set error_class, failure_reason, duration_ms) |
| UC-16 | Update old Run + Create new Run (propagate correlation_id, set causation_id) |
| UC-21 | Update Task + Update Run(s) + Update Review(s) |

---

## 4 — Execution Order Within Transaction

1. **Guard phase** — All guards evaluated first. Any failure rejects entire use case.
2. **Mutation phase** — All state changes applied. Verdict/decision set atomically with lifecycle transition.
3. **Outbox phase** — Outbox event written in same transaction (durable before dispatch).
4. **Commit phase** — Transaction commits.
5. **Dispatch phase** — OutboxDispatcherService polls and dispatches events asynchronously.

Events are durable: written in-transaction, dispatched asynchronously. If dispatch fails, state change is still valid (events retry from outbox).

---

## 5 — Core Workflow Chain

```
UC-02 Assign Task (ready → assigned; sets owner_role_id + creates Handoff)
  → Handoff acknowledged by target role
    → UC-03 Start Run (validates acknowledged handoff)
      → UC-13 Execute Agent Run (Provider)
        → UC-04 Complete Run
          → UC-05 Submit Artifact for Review
            → UC-06 Resolve Review
              verdict=approved → Task → validated (UC-11 Complete Task)
              verdict=approved_with_notes → Task → validated + follow-up task created (ready, not auto-started)
              verdict=rejected → Task → rework_required + rework Handoff created → UC-02 Reassign
              verdict=escalated → UC-20 Resolve Escalation
```

---

## 6 — Failure Handling

- **Provider failure:** Run → `failed` via UC-14, then retry evaluation
- **Timeout:** Run → `timed_out` via UC-15, then retry evaluation
- **Retry allowed:** UC-16 supersedes old run, creates new run
- **Retry exhausted:** Task → `blocked` (UC-17) or `escalated` (UC-19)
- **Concurrency conflict:** ConcurrencyError thrown, caller retries

---

## 7 — Lifecycle/Outcome Separation Rules for Orchestration

1. **UC-06 (Resolve Review):** Must set `verdict` AND transition `state` to `resolved` atomically in same transaction
2. **UC-10 (Resolve Approval):** Must set `decision` AND transition `state` to `decided` atomically
3. **UC-11 (Complete Task):** Checks `task.state === 'validated'` (not `approved`)
4. **Cascade logic** reads `review.verdict` or `approval.decision`, never lifecycle state, for business routing
5. **Closing:** Review `resolved→closed` and Approval `decided→closed` are separate lifecycle steps

---

## 8 — Handoff Integration Rules

1. **UC-02 (Assign Task):** Creates a Handoff record when `handoffParams` are provided. Sets `task.current_handoff_id`.
2. **UC-03 (Start Run):** Validates that `task.current_handoff_id` references a handoff with `status = acknowledged`. Run cannot start without this.
3. **UC-06/07 (Resolve Review — Reject):** Creates a rework Handoff from reviewer role to implementer role with rejection reason + blocking issues as acceptance criteria.
4. **Handoff acknowledgement** is a prerequisite step between assignment and execution — the target role must explicitly accept work before running.
5. **All Handoff lifecycle changes** emit `ActivityEvent` records: `handoff.created`, `handoff.acknowledged`, `handoff.completed`, `handoff.cancelled`.

---

## 9 — Delivery Lane Hooks

Orchestration integrates with the Delivery Lane for code-producing tasks.
GitHub is canonical VCS. GitHub Actions is CI. Docker-based deploy to single VPS.

### 9.1 UC-03 (Start Run) — Workspace Creation

When `task.domain ∈ {frontend, backend, frontend_delivery, backend_delivery}`:
1. Validate repository is GitHub via `DeliveryLaneService.validateRepository()`
2. Create a `repo_workspaces` record linked to project, task, run, repository
3. Branch name: `task/{task_id_prefix}/run-{run_number}`
4. Best-effort: run proceeds even if no repository configured

### 9.2 UC-06 (Resolve Review — Approve) — PullRequest Creation

When task is validated and `task.domain` is a code domain:
1. Find the run's workspace
2. Create a `pull_requests` record
3. Source branch from workspace, target branch from repository default
4. PR title includes task ID prefix and task title

### 9.3 PR Merge → Staging Deploy

On PR merge (via `DeliveryLaneService.recordPRMerge()`):
1. Validate CI passed via `validatePRMergeReady()`
2. Record PR as merged
3. Create staging Deployment record via `createStagingDeployment()`
4. Deploy executes externally (GitHub Actions or manual)
5. Update deployment status to `live` or `failed`

### 9.4 Staging → Production Promotion

Founder-only action via `DeliveryLaneService.promoteToProduction()`:
1. Validate staging deployment is `live`
2. Create production Deployment record
3. Same Docker image — no rebuild
4. Deploy via SSH to VPS

### 9.5 Rollback

Founder-only action via `DeliveryLaneService.rollback()`:
1. Mark current live deployment as `rolled_back`
2. Create new deployment with `rollback_of_deployment_id`
3. Deploy target version's Docker image

For full Delivery Lane spec, see `core/30-delivery-lane.md`.

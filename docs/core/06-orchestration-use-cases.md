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
| UC-03 | Create Run + Update Task + Read ContextPack + Read AgentRole |
| UC-04 | Update Run + Create/Update Artifact(s) |
| UC-05 | Update Artifact (×2) + Create Review + Update Review + Update Task |
| UC-06 | Update Review (set verdict + state→resolved) + Update Artifact + Update Task |
| UC-10 | Update Approval (set decision + state→decided) |
| UC-11 | Update Task (validated→done) + Update Approval(s) (decided→closed) |
| UC-12 | Update Project + Update Approval (decided→closed) |
| UC-16 | Update old Run + Create new Run |
| UC-21 | Update Task + Update Run(s) + Update Review(s) |

---

## 4 — Execution Order Within Transaction

1. **Guard phase** — All guards evaluated first. Any failure rejects entire use case.
2. **Mutation phase** — All state changes applied. Verdict/decision set atomically with lifecycle transition.
3. **Commit phase** — Transaction commits.
4. **Event phase** — Activity events emitted after commit (append-only).

Events are post-commit: if emission fails, state change is still valid (events retry).

---

## 5 — Core Workflow Chain

```
UC-02 Assign Task
  → UC-03 Start Run
    → UC-13 Execute Agent Run (Provider)
      → UC-04 Complete Run
        → UC-05 Submit Artifact for Review
          → UC-06 Resolve Review
            verdict=approved → Task → validated (UC-11 Complete Task)
            verdict=rejected → Task → rework_required → UC-02 Reassign
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

For full use case details, see original `docs/22-orchestration-use-cases-v1.md`.

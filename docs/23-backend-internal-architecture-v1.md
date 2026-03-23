# 23 — Backend Internal Architecture Blueprint V1

## 1 — Purpose

This document defines the internal application-layer architecture for AI Workshop OS V1.

It specifies service responsibilities, guard layer structure, orchestration design, worker interaction, and folder layout.

Sources:
- `docs/22-orchestration-use-cases-v1.md` (updated)
- `docs/21-lifecycle-transition-guards-v1.md` (updated)
- `docs/14-data-model-v1.md`
- `docs/15-backend-architecture-v1.md`

Stack:
- Next.js (App Router) — route handlers as API layer
- Prisma ORM — persistence
- PostgreSQL — database
- Modular monolith — no microservices, no NestJS, no external orchestration framework

---

## 2 — Application Service Map

### 2.1 ProjectService

**Responsibility:** Project CRUD, project state transitions, project-level queries.

**Use Cases:**
- UC-01 Activate Project
- UC-22 Pause Project
- UC-23 Resume Project
- UC-24 Archive Project
- UC-12 Complete Project Milestone (co-owned with OrchestrationService)

**Entities directly modified:** Project

**Invariants enforced:**
- Valid project lifecycle transitions via guard layer
- Required docs existence before activation
- All tasks terminal before completion

---

### 2.2 TaskService

**Responsibility:** Task CRUD, task state transitions, task assignment, task queries.

**Use Cases:**
- UC-02 Assign Task
- UC-11 Complete Task
- UC-17 Block Task
- UC-18 Unblock Task
- UC-19 Escalate Task
- UC-20 Resolve Task Escalation
- UC-21 Cancel Task

**Entities directly modified:** Task

**Invariants enforced:**
- One current owner role at a time
- Required fields before state advancement
- All reviews closed before done
- Cancellation requires founder authority

---

### 2.3 RunService

**Responsibility:** Run creation, run state transitions, run number sequencing, retry tracking.

**Use Cases:**
- UC-03 Start Run (run creation + state transitions)
- UC-04 Complete Run
- UC-14 Handle Run Failure
- UC-15 Handle Run Timeout
- UC-16 Supersede Run (Retry)

**Entities directly modified:** Run

**Invariants enforced:**
- Each run belongs to exactly one task
- run_number unique per task
- Terminal states are explicit
- ContextPack must exist before running (no waiver)

---

### 2.4 ArtifactService

**Responsibility:** Artifact CRUD, artifact classification, artifact state transitions, canonical flagging, storage references.

**Use Cases:**
- UC-04 Complete Run (artifact creation/classification — co-owned with RunService)
- UC-25 Freeze Artifact as Canonical
- UC-26 Supersede Artifact

**Entities directly modified:** Artifact

**Invariants enforced:**
- Artifact must reference task_id or run_id (source invariant)
- Review must be terminal before artifact accepted
- Supersede requires explicit directional link (replacement.supersedes_artifact_id == original.id)
- Rejected artifact cannot become canonical without replacement

---

### 2.5 ReviewService

**Responsibility:** Review CRUD, review state management, verdict recording, review closure.

**Use Cases:**
- UC-06 Resolve Review — Approve (review state transitions)
- UC-07 Resolve Review — Reject (review state transitions)
- UC-08 Resolve Review — Escalate (review state transitions)

**Entities directly modified:** Review

**Invariants enforced:**
- Every review has a target artifact
- Verdicts are explicit
- Review must reach closed state before artifact/task cascade
- Reviewer role must be active

---

### 2.6 ApprovalService

**Responsibility:** Approval creation, approval state transitions, founder decision recording.

**Use Cases:**
- UC-09 Request Approval
- UC-10 Resolve Approval

**Entities directly modified:** Approval

**Invariants enforced:**
- Only founder can resolve
- Target entity must exist when approving
- No duplicate pending approvals for same target
- Decision note required

---

### 2.7 ProviderService

**Responsibility:** Provider configuration, credential validation, model registry, routing policy lookup, health checks, usage logging.

**Use Cases:**
- UC-13 Execute Agent Run — provider selection, credential validation, health check, usage logging

**Entities directly modified:** ProviderUsageLog, Provider (health fields), ProviderCredential (validation fields)

**Invariants enforced:**
- Provider must be healthy before execution
- Credential must be valid
- Fallback only when explicitly allowed by RoutingPolicy
- Silent provider switch on critical work is forbidden

---

### 2.8 OrchestrationService

**Responsibility:** Multi-entity workflow coordination. This is the workflow brain. It calls other services. It does not replace them.

**Use Cases:**
- UC-01 Activate Project (coordinates ProjectService + ApprovalService)
- UC-03 Start Run (coordinates RunService + TaskService + ContextService)
- UC-04 Complete Run (coordinates RunService + ArtifactService)
- UC-05 Submit Artifact for Review (coordinates ArtifactService + ReviewService + TaskService)
- UC-06 Resolve Review — Approve (coordinates ReviewService + ArtifactService + TaskService)
- UC-07 Resolve Review — Reject (coordinates ReviewService + ArtifactService + TaskService)
- UC-11 Complete Task (coordinates TaskService + ApprovalService)
- UC-12 Complete Project Milestone (coordinates ProjectService + ApprovalService + TaskService)
- UC-16 Supersede Run (coordinates RunService — old + new)
- UC-21 Cancel Task (coordinates TaskService + RunService + ReviewService)

**Entities directly modified:** None — modifies through delegated service calls only.

**Rules:**
- OrchestrationService wraps multi-entity use cases in a single Prisma transaction
- OrchestrationService calls guards before calling services
- OrchestrationService emits activity events after successful transaction commit
- OrchestrationService never bypasses guard layer

---

### 2.9 ActivityService

**Responsibility:** Activity event creation, event queries, project timeline, dashboard feed.

**Use Cases:**
- Called by all other services and OrchestrationService after state transitions

**Entities directly modified:** ActivityEvent

**Invariants enforced:**
- Every important state transition emits an event
- Events are append-only (no update, no delete)
- Events reference entity_type, entity_id, project_id

---

### 2.10 ContextService

**Responsibility:** ContextPack creation, document/artifact selection for context, assumptions storage, missing context flagging.

**Use Cases:**
- UC-03 Start Run (context pack must exist)
- UC-13 Execute Agent Run (context pack read for provider call)

**Entities directly modified:** ContextPack

**Invariants enforced:**
- Context packs are scoped to one task
- Irrelevant context is not included by default
- Missing context must be flagged explicitly

---

### 2.11 DocumentService

**Responsibility:** Document CRUD, version metadata, canonical status, project doc retrieval.

**Use Cases:**
- UC-01 Activate Project (required docs validation — read only)

**Entities directly modified:** Document

**Invariants enforced:**
- Canonical docs are not silently overwritten
- Document links remain traceable to task/artifact

---

### 2.12 AgentRoleService

**Responsibility:** Agent role records, allowed/forbidden action metadata, role lookup.

**Use Cases:**
- UC-02 Assign Task (role validation)
- UC-03 Start Run (role validation)
- UC-05 Submit Artifact for Review (reviewer role validation)

**Entities directly modified:** AgentRole

**Invariants enforced:**
- Only active roles can receive work

---

## 3 — Domain Guard Layer Structure

### 3.1 Guard Function Location

All guard functions live in a dedicated guard layer, separated from services:

```
src/lib/guards/
  project.guard.ts      — guardProjectTransition()
  task.guard.ts          — guardTaskTransition()
  run.guard.ts           — guardRunTransition()
  artifact.guard.ts      — guardArtifactTransition()
  review.guard.ts        — guardReviewTransition()
  approval.guard.ts      — guardApprovalTransition()
  index.ts               — re-exports all guards
```

### 3.2 Guard Function Contract

Every guard function follows the same contract:

```
function guardXxxTransition(
  entity: CurrentEntityState,
  to_state: TargetState,
  context: TransitionContext    // includes related entities needed for validation
): { allowed: true } | { allowed: false, reason: string }
```

Guards are pure functions. They do NOT:
- Modify database state
- Emit events
- Call other services
- Access network resources

Guards DO:
- Validate current state
- Validate target state
- Check preconditions against provided context
- Return allow/deny with explicit reason

### 3.3 How Services Call Guards

1. Service method receives request
2. Service loads current entity state + related context from database
3. Service calls guard function with entity + target state + context
4. If guard returns `{ allowed: false }` → service throws `TransitionDeniedError` with reason
5. If guard returns `{ allowed: true }` → service proceeds with state mutation inside transaction

### 3.4 Preventing Direct State Mutation Bypass

**Rule: No Prisma `update()` call may set a `state` field directly outside a service method that calls the guard first.**

Enforcement mechanisms:

1. **Repository pattern with guarded mutations:**
   Each module has a repository file. State-changing mutations go through repository methods that require a `guardResult` parameter:

   ```
   src/modules/tasks/task.repository.ts
     → transitionState(taskId, newState, guardResult)   // requires guard result
     → updateFields(taskId, data)                        // cannot modify state field
   ```

2. **Prisma middleware (defense in depth):**
   A Prisma middleware logs a warning or throws if a `state` field is updated without the `__guardVerified` flag in the query context. This is a safety net, not the primary control.

3. **Code review rule:**
   Any PR that contains `state:` in a Prisma `update()` call outside a repository `transitionState()` method is automatically flagged.

---

## 4 — Orchestration Layer Design

### 4.1 Centralized Orchestration

OrchestrationService is the single entry point for all multi-entity use cases.

Single-entity use cases (e.g., UC-17 Block Task, UC-19 Escalate Task) may be called directly on the owning service. But any use case that modifies more than one entity type MUST go through OrchestrationService.

### 4.2 Transaction Boundaries

Each orchestration use case runs inside ONE Prisma interactive transaction (`prisma.$transaction()`).

**Per-use-case transaction scope:**

| Use Case | Transaction includes |
|---|---|
| UC-01 Activate Project | read Approval + read Documents + update Project |
| UC-03 Start Run | create Run + update Task + read ContextPack + read AgentRole |
| UC-04 Complete Run | update Run + create/update Artifact(s) |
| UC-05 Submit Artifact | update Artifact (×2) + create Review + update Review + update Task |
| UC-06 Approve Review | update Review (×2: verdict + close) + update Artifact + update Task |
| UC-07 Reject Review | update Review (×2: verdict + close) + update Artifact + update Task |
| UC-11 Complete Task | update Task + update Approval(s) |
| UC-12 Complete Milestone | update Project + update Approval |
| UC-16 Supersede Run | update old Run + create new Run |
| UC-21 Cancel Task | update Task + update Run(s) + update Review(s) |

### 4.3 State Transition + Event Emission Ordering

Within each transaction:

1. **Guard phase** — All guards for all transitions in the use case are evaluated FIRST. If any guard fails, the entire use case is rejected before any mutation.

2. **Mutation phase** — All entity state changes are applied within the transaction.

3. **Commit phase** — Transaction commits.

4. **Event phase** — Activity events are emitted AFTER successful commit. Events are written in a separate operation (or appended to a post-commit queue).

**Why events are post-commit:**
- Events must not be visible if the transaction rolls back
- Events are append-only audit records — they must reflect reality
- If event emission fails, the state change is still valid (events can be retried)

### 4.4 Failure and Rollback

**Synchronous use cases:**
- If any guard fails → reject immediately, no mutations applied
- If any Prisma operation fails within transaction → automatic rollback of all changes in that transaction
- If post-commit event emission fails → log error, schedule event retry (state is already committed and valid)

**Asynchronous use cases (UC-03, UC-04, UC-13, UC-14, UC-15):**
- Worker picks up job from queue
- Worker calls OrchestrationService within a transaction
- If worker crashes mid-execution → job remains in queue for retry (BullMQ semantics)
- If provider call fails → RunService transitions run to `failed` (not a rollback — this is a valid forward state)
- Provider failure never corrupts workflow state

---

## 5 — Worker Layer Structure

### 5.1 Workers Overview

| Worker | Responsibility | Queue |
|---|---|---|
| RunExecutor | Picks up run jobs, coordinates context loading + provider call + output handling | `run-execution` |
| ProviderAdapter | Handles actual provider API call, captures usage, handles response/error | Called by RunExecutor (not a separate queue) |
| RetryHandler | Evaluates failed/timed-out runs against retry policy, creates supersede+retry if allowed | `run-retry-evaluation` |
| TimeoutHandler | Monitors running runs against timeout thresholds, transitions to timed_out | `run-timeout-check` (scheduled/periodic) |

### 5.2 RunExecutor Flow

```
1. RunExecutor receives job { run_id } from run-execution queue

2. RunExecutor calls OrchestrationService.prepareRun(run_id)
   → guard: Run state == preparing
   → guard: ContextPack exists
   → transition: Run preparing → running
   → commit

3. RunExecutor calls ProviderAdapter.execute(run)
   → ProviderService resolves routing policy
   → ProviderService validates credential + health
   → ProviderAdapter makes API call to provider
   → ProviderAdapter captures response or error
   → ProviderService logs usage to ProviderUsageLog

4a. On success:
    RunExecutor calls OrchestrationService.completeRun(run_id, artifacts)
    → guard: Run state == running, artifacts exist
    → create Artifact records
    → transition: Run running → produced_output
    → classify artifacts if metadata available
    → commit
    → emit events

4b. On provider failure:
    RunExecutor calls RunService.failRun(run_id, failure_reason)
    → guard: Run state == running
    → transition: Run running → failed
    → set failure_reason
    → commit
    → emit event
    → enqueue to run-retry-evaluation queue

4c. On timeout:
    TimeoutHandler detects overdue run
    → calls RunService.timeoutRun(run_id)
    → guard: Run state == running
    → transition: Run running → timed_out
    → commit
    → emit event
    → enqueue to run-retry-evaluation queue
```

### 5.3 ProviderAdapter Structure

ProviderAdapter is NOT a queue worker. It is a synchronous adapter called by RunExecutor.

```
ProviderAdapter
  ├── resolve(task, contextPack)      → returns { provider, model, credential }
  │   └── calls ProviderService.resolveRouting()
  │   └── calls ProviderService.validateHealth()
  │   └── calls ProviderService.validateCredential()
  │
  ├── execute(provider, model, credential, prompt)  → returns ProviderResponse | ProviderError
  │   └── makes HTTP call to provider API
  │   └── captures token usage, latency
  │   └── handles rate limits, auth errors, network errors
  │
  ├── handleFallback(task, primaryError)  → returns ProviderResponse | ProviderError
  │   └── checks RoutingPolicy.allow_fallback
  │   └── if allowed: resolve fallback provider/model, execute
  │   └── if not allowed: return primaryError
  │
  └── logUsage(run, provider, model, tokenUsage, cost, success)
      └── calls ProviderService.logUsage()
```

### 5.4 RetryHandler Flow

```
1. RetryHandler receives job { run_id } from run-retry-evaluation queue

2. RetryHandler loads run + task + retry history

3. RetryHandler evaluates retry policy:
   - How many retries already attempted for this task?
   - Is retry limit exceeded?
   - Is task still in_progress?

4a. If retry allowed:
    RetryHandler calls OrchestrationService.retryRun(run_id)
    → UC-16: supersede old run, create new run
    → enqueue new run to run-execution queue

4b. If retry not allowed:
    RetryHandler decides:
    → If transient failure: call TaskService.blockTask() (UC-17)
    → If persistent failure: call TaskService.escalateTask() (UC-19)
    → emit appropriate events
```

### 5.5 Service Interaction Diagram

```
API Route Handler
  │
  ▼
OrchestrationService ──────────────────────────┐
  │                                            │
  ├── calls guards (lib/guards/*.guard.ts)     │
  │                                            │
  ├── calls ProjectService                     │
  ├── calls TaskService                        │
  ├── calls RunService                         │
  ├── calls ArtifactService                    │
  ├── calls ReviewService                      │
  ├── calls ApprovalService                    │
  ├── calls ContextService                     │
  ├── calls ActivityService (post-commit)      │
  │                                            │
  └── enqueues to Worker Queue ────────────────┘
                │
                ▼
        RunExecutor (Worker)
                │
                ├── calls OrchestrationService (for state transitions)
                ├── calls ProviderAdapter (for provider API call)
                │       │
                │       └── calls ProviderService (routing, health, usage)
                │
                └── enqueues to RetryHandler (on failure)
                        │
                        └── calls OrchestrationService or TaskService
```

---

## 6 — Folder Structure

```text
src/
  app/
    api/
      projects/
        [id]/
          activate/route.ts          — UC-01
          pause/route.ts             — UC-22
          resume/route.ts            — UC-23
          archive/route.ts           — UC-24
          complete-milestone/route.ts — UC-12
          route.ts                   — CRUD
      tasks/
        [id]/
          assign/route.ts            — UC-02
          complete/route.ts          — UC-11
          block/route.ts             — UC-17
          unblock/route.ts           — UC-18
          escalate/route.ts          — UC-19
          resolve-escalation/route.ts — UC-20
          cancel/route.ts            — UC-21
          runs/
            start/route.ts           — UC-03
            route.ts                 — list runs
          route.ts                   — CRUD
      artifacts/
        [id]/
          submit/route.ts            — UC-05
          freeze/route.ts            — UC-25
          route.ts                   — CRUD
      reviews/
        [id]/
          resolve/route.ts           — UC-06, UC-07, UC-08
          route.ts                   — CRUD
      approvals/
        [id]/
          resolve/route.ts           — UC-10
          route.ts                   — CRUD
        route.ts                     — UC-09 (create)
      runs/
        [id]/
          retry/route.ts             — UC-16
          route.ts                   — read
      providers/
        route.ts                     — provider list, health
      activity/
        route.ts                     — timeline queries

  modules/
    projects/
      project.service.ts
      project.repository.ts
      project.types.ts
      project.validators.ts
    documents/
      document.service.ts
      document.repository.ts
      document.types.ts
    tasks/
      task.service.ts
      task.repository.ts
      task.types.ts
      task.validators.ts
    context/
      context.service.ts
      context.repository.ts
      context.types.ts
    runs/
      run.service.ts
      run.repository.ts
      run.types.ts
    artifacts/
      artifact.service.ts
      artifact.repository.ts
      artifact.types.ts
      artifact.validators.ts
    reviews/
      review.service.ts
      review.repository.ts
      review.types.ts
    approvals/
      approval.service.ts
      approval.repository.ts
      approval.types.ts
    agent-roles/
      agent-role.service.ts
      agent-role.repository.ts
      agent-role.types.ts
    providers/
      provider.service.ts
      provider.repository.ts
      provider.types.ts
      provider-adapter.ts
      routing-resolver.ts
    activity/
      activity.service.ts
      activity.repository.ts
      activity.types.ts
    orchestration/
      orchestration.service.ts
      orchestration.types.ts

  lib/
    guards/
      project.guard.ts
      task.guard.ts
      run.guard.ts
      artifact.guard.ts
      review.guard.ts
      approval.guard.ts
      index.ts
      guard.types.ts
    db/
      prisma.ts                    — Prisma client singleton
      prisma.middleware.ts         — state mutation safety net
    events/
      event.types.ts               — ActivityEvent type definitions
      event.emitter.ts             — post-commit event queue
    errors/
      transition-denied.error.ts
      guard-violation.error.ts
      not-found.error.ts
      forbidden.error.ts
    utils/
      slug.ts
      date.ts
      uuid.ts

  workers/
    run-executor.worker.ts
    retry-handler.worker.ts
    timeout-handler.worker.ts
    worker.config.ts               — queue names, concurrency, retry settings
    worker.registry.ts             — worker startup and registration

prisma/
  schema.prisma
  seed.ts
  migrations/
```

---

## 7 — Key Architectural Rules

### 7.1 Service boundaries

- Each service owns one entity type
- Services never directly import other services' repositories
- Cross-entity coordination goes through OrchestrationService

### 7.2 Guard boundaries

- Guards are pure functions in `lib/guards/`
- Guards are called by services before mutations
- Guards never call the database — they receive pre-loaded context

### 7.3 Transaction boundaries

- One Prisma transaction per use case
- Events emitted post-commit only
- No nested transactions

### 7.4 Worker boundaries

- Workers call services/orchestration — they do not contain business logic
- Workers handle queue mechanics: retry, timeout, dead-letter
- Provider API calls happen only inside RunExecutor via ProviderAdapter

### 7.5 API route boundaries

- Route handlers validate input (Zod)
- Route handlers call exactly one service or OrchestrationService method
- Route handlers do not contain business logic
- Route handlers return structured responses

### 7.6 No bypass rule

- No state field may be modified outside a guarded service method
- No multi-entity use case may bypass OrchestrationService
- No provider call may happen outside ProviderAdapter
- No event may be emitted inside a transaction (only post-commit)

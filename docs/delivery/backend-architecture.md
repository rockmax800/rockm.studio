---
doc_kind: reference
load_strategy: retrieve
layer: delivery
criticality: high
---

# 07 — Backend Architecture

> Layer 1 — Core Engine

## 1 — Purpose

Defines the internal application-layer architecture: service map, guard layer, orchestration design, worker layer, and folder layout.

---

## 2 — Architecture Philosophy

- **Modular monolith** — no microservices
- **Workflow-centric** — not CRUD-centric
- **State transitions are first-class** — through guards and orchestration
- **Events for auditability** — every important action emits activity events
- **Human approval is a hard gate** — no auto-resolve on major decisions

---

## 3 — Application Service Map

| Service | Responsibility | Entities Modified |
|---------|---------------|-------------------|
| ProjectService | Project CRUD, state transitions | Project |
| TaskService | Task CRUD, assignment, state transitions | Task |
| RunService | Run creation, state transitions, sequencing | Run |
| ArtifactService | Artifact CRUD, classification, canonical flagging | Artifact |
| ReviewService | Review CRUD, verdict recording, closure | Review |
| ApprovalService | Approval creation, founder decision recording | Approval |
| ProviderService | Provider config, routing, health, usage logging | ProviderUsageLog |
| OrchestrationService | Multi-entity workflow coordination | None (delegates) |
| ActivityService | Event creation and queries | ActivityEvent |
| ContextService | ContextPack creation and assembly | ContextPack |
| DocumentService | Document CRUD, version metadata | Document |
| AgentRoleService | Role records, lookup, validation | AgentRole |

---

## 4 — Guard Layer

Location: `src/guards/`

- Guards are pure validation functions
- Called by services before state mutations
- Return `{ allowed: true }` or `{ allowed: false, reason }`
- No Prisma `update()` may set `state` without guard verification

---

## 5 — OrchestrationService Rules

- Single entry point for multi-entity use cases
- Wraps operations in Prisma transactions (Serializable isolation)
- Calls guards before calling services
- Emits activity events after successful commit
- Never bypasses guard layer
- Uses optimistic locking (version field)

---

## 6 — Worker Layer

| Worker | Responsibility | Queue |
|--------|---------------|-------|
| RunExecutor | Run jobs: context loading + provider call + output handling | `run-execution` |
| ProviderAdapter | Provider API calls, usage capture, error handling | Called by RunExecutor |
| RetryHandler | Evaluates retry policy, creates supersede+retry | `run-retry-evaluation` |
| TimeoutHandler | Monitors running runs, transitions to timed_out | `run-timeout-check` |

---

## 7 — Technology Stack

> **Canonical stack definition lives in `docs/00-runtime-truth.md`.** Summary below.

- NestJS — API layer and business logic
- Prisma ORM — persistence
- PostgreSQL — database
- Zod — validation
- Redis + BullMQ — job queue, scheduling, retry
- Node.js worker process — RunExecutor, provider calls
- Docker sandbox — isolated code execution

For full service interaction details, see `docs/archive/23-backend-internal-architecture-v1.md`.

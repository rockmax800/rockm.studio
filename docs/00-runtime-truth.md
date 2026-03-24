---
doc_kind: contract
load_strategy: auto
layer: cross-cutting
criticality: critical
version: v2.0
---

# AI Production Studio — Runtime Truth

> **Canonical source of truth for the production runtime stack.**
> All other documents defer to this file for stack decisions.
> If a document contradicts this file, this file wins.
> **Architecture is LOCKED. No changes without explicit founder approval.**

---

## 1 — Canonical Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js (App Router) | TypeScript, Tailwind CSS, shadcn/ui |
| **Client data** | TanStack Query | Server-state cache |
| **Validation** | Zod | Shared between client and server |
| **Backend** | NestJS | Modular monolith, TypeScript |
| **ORM** | Prisma | Type-safe DB access, migrations |
| **Database** | PostgreSQL 16+ | Single instance, Docker-managed |
| **Queue** | Redis + BullMQ | Job queue, retry, scheduling |
| **Worker Runtime** | Node.js (separate process) | RunExecutor, provider calls, sandbox orchestration |
| **Code Execution** | Docker sandbox | Isolated containers with resource limits |
| **VCS** | GitHub | Single integration surface |
| **CI** | GitHub Actions | Automated checks on PRs |
| **Deploy** | Docker → VPS | Single-server Docker Compose deployment |
| **Secret Storage** | Environment config | Never in DB, never in logs |

---

## 2 — Runtime Separation

```
┌──────────────────┐                  ┌──────────────────┐
│  CONTROL PLANE   │                  │ EXECUTION PLANE  │
│                  │                  │                  │
│  Next.js UI      │                  │  RunExecutor     │
│  NestJS API      │    PostgreSQL    │  Docker Sandbox  │
│  Orchestration   │◄───────────────►│  Git Operations  │
│  Dashboards      │   (event_log)   │  CI Tracking     │
│  Client Portal   │      Redis      │  Deployments     │
└──────────────────┘   (BullMQ)      └──────────────────┘
        │                                     │
        ▼                                     ├──► GitHub
   UI only                                    ├──► VPS (SSH)
                                              ├──► Registry
                                              └──► DNS
```

### Control Plane

- Next.js App Router (UI)
- NestJS (API layer, business logic)
- OrchestrationService (state transitions)
- Founder Dashboard, Client Portal
- **Never** executes code, runs Docker, or performs git operations

### Execution Plane

- Separate Node.js worker process
- RunExecutor: context loading → provider call → output handling
- Docker sandbox management
- Git operations (clone, commit, push)
- CI status tracking, deployment operations
- Communicates with Control Plane **via PostgreSQL + event_log + Redis/BullMQ**

### Database

- PostgreSQL as single source of state
- Prisma ORM for type-safe access
- event_log as canonical audit trail
- Transactional outbox for external dispatch

### Queue

- Redis as message broker
- BullMQ for job scheduling, retry policies, dead-letter handling
- No pg_cron — all scheduling through BullMQ

### External Systems

| System | Access From | Purpose |
|--------|------------|---------|
| GitHub | Execution Plane | VCS, PR management |
| GitHub Actions | External (webhook) | CI pipeline |
| VPS | Execution Plane | Production deploy target |
| Container Registry | Execution Plane | Image storage |
| DNS Provider | Execution Plane | Domain binding |
| LLM Providers | Execution Plane | AI model calls |

---

## 3 — What Is NOT Used

The following technologies are **explicitly excluded** from the production runtime:

| Excluded | Reason |
|----------|--------|
| Vite (standalone) | Next.js handles bundling |
| Supabase client SDK | Not used as runtime ORM — Prisma is primary |
| Supabase Edge Functions | Not used — NestJS handles all backend logic |
| Supabase Auth | Not used — internal system, no public users |
| Supabase Realtime | Not used — replaced by application-level WebSocket if needed |
| Kafka / RabbitMQ / SQS | Over-engineered for single-server |
| Kubernetes / ECS | Single VPS deployment only |
| Multi-cloud | Single VPS target |
| GraphQL | REST + typed DTOs sufficient |
| MongoDB / Firebase | PostgreSQL is the only database |
| Nuxt / Vue / Angular | Next.js + React is the only frontend framework |
| pg_cron | BullMQ handles all scheduling |

---

## 4 — Supabase Scope

Supabase is **NOT used** in the production runtime stack.

PostgreSQL is hosted and managed directly (Docker on VPS).
Prisma is the canonical ORM.
NestJS handles all API and business logic.
BullMQ handles all job scheduling.

If any document references Supabase Edge Functions, Supabase client SDK, or Lovable Cloud as runtime components, that reference is **invalid** and must be corrected.

---

## 5 — Worker Architecture

```
┌─────────────────────────────────────┐
│         Worker Process              │
│                                     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │ RunExecutor  │  │ProviderAdapter│ │
│  │             │  │              │ │
│  │ Poll BullMQ │──│ Call LLM API │ │
│  │ Load context│  │ Capture usage│ │
│  │ Write output│  │ Handle errors│ │
│  └─────────────┘  └──────────────┘ │
│         │                           │
│  ┌──────▼──────┐  ┌──────────────┐ │
│  │Docker Sandbox│  │ RetryHandler │ │
│  │ Code exec   │  │ Timeout check│ │
│  │ Isolated    │  │ Stall detect │ │
│  └─────────────┘  └──────────────┘ │
└─────────────────────────────────────┘
```

---

## 6 — Hard Rules

1. **Control Plane never executes code.**
2. **Sandbox never has production deploy credentials.**
3. **Learning Plane never has secret access.**
4. **Secrets never written to event_log.**
5. **No business decision may rely on a boolean approval flag** — all decisions go through the Approval entity.
6. **event_log is append-only and immutable.**
7. **No stack changes without explicit founder approval.**

---

## 7 — Document Precedence

This document is the **canonical runtime truth**. If any other document references a different stack component, this file takes precedence.

| Document | Relationship |
|----------|-------------|
| `00-system-overview.md` | Defers to this file for stack |
| `delivery/backend-architecture.md` | Defers to this file for tech choices |
| `archive/*` | Superseded — historical only |
| `delivery/runtime-and-secret-governance.md` | Complements — security detail |
| `product/constraints.md` | Defers to this file for infrastructure |

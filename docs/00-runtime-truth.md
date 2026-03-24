---
doc_kind: contract
load_strategy: auto
layer: cross-cutting
criticality: critical
version: v1.0
---

# AI Production Studio — Runtime Truth

> **Canonical source of truth for the production runtime stack.**
> All other documents defer to this file for stack decisions.
> If a document contradicts this file, this file wins.

---

## 1 — Canonical Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js (App Router) | React, Tailwind CSS, shadcn/ui, TypeScript |
| **Client data** | TanStack Query | Server-state cache |
| **Validation** | Zod | Shared between client and server |
| **Backend API** | Next.js Route Handlers | App Router `app/api/` |
| **ORM** | Prisma | Type-safe DB access, migrations |
| **Database** | PostgreSQL 16+ | Single instance, Docker-managed |
| **Realtime (UI)** | Supabase Realtime | WebSocket for dashboard refresh only |
| **Edge Functions** | Supabase Edge Functions | Serverless helpers (blog, predictions, HR) |
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
│  API Routes      │    PostgreSQL    │  Docker Sandbox  │
│  Orchestration   │◄───────────────►│  Git Operations  │
│  Dashboards      │   (event_log)   │  CI Tracking     │
│  Client Portal   │                  │  Deployments     │
└──────────────────┘                  └──────────────────┘
        │                                     │
        ▼                                     ├──► GitHub
   UI only                                    ├──► VPS (SSH)
                                              ├──► Registry
                                              └──► DNS
```

### Control Plane

- Next.js App Router (UI + API routes)
- OrchestrationService (state transitions)
- Founder Dashboard, Client Portal
- **Never** executes code, runs Docker, or performs git operations

### Execution Plane

- Separate Node.js worker process
- RunExecutor: context loading → provider call → output handling
- Docker sandbox management
- Git operations (clone, commit, push)
- CI status tracking, deployment operations
- Communicates with Control Plane **only via PostgreSQL + event_log**

### Database

- PostgreSQL as single source of state
- Prisma ORM for type-safe access
- event_log as canonical audit trail
- Transactional outbox for external dispatch

### External Systems

| System | Access From | Purpose |
|--------|------------|---------|
| GitHub | Execution Plane | VCS, PR management |
| GitHub Actions | External (webhook) | CI pipeline |
| VPS | Execution Plane | Production deploy target |
| Container Registry | Execution Plane | Image storage |
| DNS Provider | Execution Plane | Domain binding |
| Supabase | Control Plane | Realtime UI, Edge Functions |
| LLM Providers | Execution Plane | AI model calls |

---

## 3 — What Is NOT Used

The following technologies are **explicitly excluded** from the production runtime:

| Excluded | Reason |
|----------|--------|
| Vite (standalone) | Next.js handles bundling; Vite exists only in Lovable dev environment |
| NestJS | Replaced by Next.js App Router + modular service layer |
| Redis / BullMQ | Replaced by PostgreSQL-backed job queue + pg_cron |
| Kafka / RabbitMQ / SQS | Over-engineered for single-server |
| Kubernetes / ECS | Single VPS deployment only |
| Multi-cloud | Single VPS target |
| GraphQL | REST + typed DTOs sufficient |
| MongoDB / Firebase | PostgreSQL is the only database |
| Edge-based executor | Docker sandbox on VPS |
| Microservices | Modular monolith architecture |

---

## 4 — Supabase Scope

Supabase is used **selectively**, not as the core architecture:

| Used | Not Used |
|------|----------|
| PostgreSQL hosting (Lovable Cloud) | Supabase Auth (internal system, no public users) |
| Realtime (WebSocket for UI refresh) | Supabase Storage (not needed in v1) |
| Edge Functions (serverless helpers) | Supabase client SDK as primary ORM (Prisma is primary) |

Prisma remains the canonical ORM for all Delivery Plane operations.
Supabase client SDK is used only for Realtime subscriptions and Edge Function invocations from the frontend.

---

## 5 — Worker Architecture

```
┌─────────────────────────────────────┐
│         Worker Process              │
│                                     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │ RunExecutor  │  │ProviderAdapter│ │
│  │             │  │              │ │
│  │ Poll queue  │──│ Call LLM API │ │
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

---

## 7 — Document Precedence

This document is the **canonical runtime truth**. If any other document references a different stack component, this file takes precedence.

| Document | Relationship |
|----------|-------------|
| `00-system-overview.md` | Defers to this file for stack |
| `delivery/backend-architecture.md` | Defers to this file for tech choices |
| `archive/19-tech-stack-decision-v1.md` | Superseded — historical only |
| `delivery/runtime-and-secret-governance.md` | Complements — security detail |

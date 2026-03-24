---
doc_kind: contract
load_strategy: auto
layer: cross-cutting
criticality: critical
version: v3.0
---

# AI Production Studio — Runtime Truth

> **Canonical source of truth for what is actually running on the current branch.**
> All other documents defer to this file for stack decisions.
> If a document contradicts this file, this file wins.

---

## Document Honesty Rule

1. This document describes the **current branch reality first**.
2. Future architecture is described only as a **planned target state**, clearly labelled.
3. No document may claim a technology is "canonical" if it is not present in `package.json` or actively used in `src/`.
4. If the implemented runtime and the target runtime diverge, both must be documented separately.

---

## 1 — Current Implemented Runtime

This is what actually runs when a contributor checks out the repository and starts the dev server.

| Layer | Technology | Evidence |
|-------|-----------|----------|
| **Build / Dev Server** | Vite 5 | `vite.config.ts`, `package.json` |
| **Frontend Framework** | React 18 | `src/main.tsx`, `react` dependency |
| **Routing** | React Router 6 (client-side) | `src/App.tsx`, `react-router-dom` dependency |
| **Styling** | Tailwind CSS + shadcn/ui | `tailwind.config.ts`, `src/components/ui/` |
| **Client State** | TanStack React Query | `@tanstack/react-query` dependency |
| **Validation** | Zod | `zod` dependency |
| **Data Access** | Supabase JS client | `src/integrations/supabase/client.ts`, `@supabase/supabase-js` dependency |
| **Backend Functions** | Supabase Edge Functions | `supabase/functions/` |
| **Database** | PostgreSQL (Supabase-hosted) | `supabase/config.toml`, migrations in `supabase/migrations/` |
| **ORM (schema reference)** | Prisma (schema file only) | `prisma/schema.prisma` — used for type reference, not active runtime ORM |
| **TypeScript** | TypeScript 5 | `tsconfig.json`, `tsconfig.app.json` |

### What is NOT currently running

| Technology | Status |
|-----------|--------|
| Next.js | **Not installed.** No `next` in `package.json`. No App Router. |
| NestJS | **Not installed.** No `@nestjs/*` in `package.json`. No API modules. |
| Prisma Client (runtime) | **Not used at runtime.** Schema exists for reference. Supabase client is the active data layer. |
| Redis / BullMQ | **Not installed.** No queue infrastructure in the current branch. |
| Docker sandbox | **Not implemented.** No Dockerfile or container orchestration for code execution. |
| Separate Worker process | **Not implemented.** `src/workers/runExecutor.ts` exists as application code, not a separate Node.js process. |

### Current Architecture (as implemented)

```
┌─────────────────────────────────────────────┐
│              BROWSER (SPA)                  │
│                                             │
│  Vite + React 18 + React Router 6           │
│  TanStack Query (server-state cache)        │
│  shadcn/ui + Tailwind CSS                   │
│  Supabase JS client (data access)           │
│                                             │
│  src/pages/        → page components        │
│  src/components/   → UI components          │
│  src/hooks/        → data hooks             │
│  src/services/     → service logic          │
│  src/lib/          → utilities              │
└──────────────┬──────────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────────┐
│         SUPABASE (managed backend)          │
│                                             │
│  PostgreSQL database                        │
│  Edge Functions (supabase/functions/)        │
│  Auto-generated types (types.ts)            │
│  Row-Level Security policies                │
└─────────────────────────────────────────────┘
```

### API Route Handlers

The `app/api/` directory contains Next.js-style route handlers. These are **not currently served** by a running Next.js server. They exist as pre-written code for the target architecture migration. In the current runtime, equivalent functionality is handled through Supabase client calls and Edge Functions.

---

## 2 — Target Runtime (not yet implemented on current branch)

The following architecture is the **planned production target**. It is documented here to preserve the strategic vision, but none of these components are active in the current repository.

> **Migration status:** Not started. See `docs/00-transition-status.md` for tracking.

| Layer | Planned Technology | Current Status |
|-------|--------------------|----------------|
| **Frontend** | Next.js (App Router) | ❌ Not installed |
| **Backend** | NestJS (modular monolith) | ❌ Not installed |
| **ORM** | Prisma (runtime client) | ⚠️ Schema exists, client not used |
| **Queue** | Redis + BullMQ | ❌ Not installed |
| **Worker Runtime** | Separate Node.js process | ❌ Not implemented |
| **Code Execution** | Docker sandbox | ❌ Not implemented |
| **CI** | GitHub Actions | ⚠️ No workflow files in repo |
| **Deploy** | Docker → VPS | ❌ Not implemented |

### Target Architecture (planned)

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
```

---

## 3 — Hard Rules (apply to both current and target)

1. **Secrets never written to event logs.**
2. **No business decision may rely on a boolean approval flag** — all decisions go through the Approval entity.
3. **event_log is append-only and immutable.**
4. **No stack changes without explicit founder approval.**
5. **Architecture lock active** — the target architecture is locked. The current runtime is transitional.

---

## 4 — Document Precedence

This document is the **canonical runtime truth**. If any other document references a different stack component, this file takes precedence.

| Document | Relationship |
|----------|-------------|
| `README.md` | Must match this file for stack claims |
| `00-system-overview.md` | Defers to this file for stack |
| `delivery/backend-architecture.md` | Describes target architecture — must be labelled as planned |
| `archive/*` | Superseded — historical only |
| `archive/19-tech-stack-decision-v1.md` | Records the strategic decision — target, not current |
| `delivery/runtime-and-secret-governance.md` | Complements — security detail |
| `product/constraints.md` | Defers to this file for infrastructure |
| `00-transition-status.md` | Tracks migration from current → target |
| `integrations/01-ruflo-execution-engine.md` | Optional external execution engine — does not change this app's role |

---

## 5 — External Execution Engines

The current branch may integrate with external orchestration/execution engines
(e.g. Ruflo) without changing the app's canonical control-plane role.

**Key boundary:** External engines execute work. This app owns all product
state — projects, tasks, runs, artifacts, reviews, approvals, and deployments.

> **Do not confuse the orchestration engine with the source of truth.**
> See `docs/integrations/01-ruflo-execution-engine.md` for the full
> architecture decision record.

External engine integration is experimental and feature-gated. The app must
function fully without any external engine connected.

---
doc_kind: status
load_strategy: auto
layer: cross-cutting
criticality: high
version: v1.0
---

# AI Production Studio — Transition Status

> Tracks the gap between the **current implemented runtime** and the **target production architecture**.
> See `docs/00-runtime-truth.md` for full details on both.

---

## Current Runtime

**Vite + React 18 + React Router 6 + Supabase client + TanStack Query**

Fully functional prototype / development workspace running as a single-page application with Supabase as the managed backend.

---

## Target Runtime

**Next.js + NestJS + Prisma + PostgreSQL + Redis/BullMQ + Docker**

Production-grade orchestration system with separated control and execution planes.

---

## Migration Checklist

| Component | From (current) | To (target) | Status |
|-----------|---------------|-------------|--------|
| Build system | Vite | Next.js (App Router) | ❌ Not started |
| Routing | React Router 6 | Next.js App Router | ❌ Not started |
| Backend API | Supabase Edge Functions + client calls | NestJS modular monolith | ❌ Not started |
| Data access | Supabase JS client | Prisma Client | ❌ Not started |
| Database hosting | Supabase-managed PostgreSQL | Self-hosted PostgreSQL (Docker) | ❌ Not started |
| Queue / scheduling | None | Redis + BullMQ | ❌ Not started |
| Worker runtime | In-app service code | Separate Node.js worker process | ❌ Not started |
| Code execution | None | Docker sandbox | ❌ Not started |
| CI pipeline | None | GitHub Actions | ❌ Not started |
| Deployment | Lovable / Supabase hosting | Docker Compose → VPS | ❌ Not started |
| Monorepo structure | Flat `src/` | `apps/web`, `apps/api`, `apps/worker` | ❌ Not started |

---

## Pre-existing Target Artifacts

These files exist in the repository but belong to the **target architecture**, not the current runtime:

| Path | Purpose | Active? |
|------|---------|---------|
| `app/api/**` | Next.js route handlers | ❌ Not served — no Next.js server |
| `prisma/schema.prisma` | Database schema definition | ⚠️ Reference only — Prisma Client not used at runtime |
| `src/workers/runExecutor.ts` | Worker entry point | ⚠️ Application code — not a separate process |
| `src/services/providers/*.ts` | LLM provider adapters | ⚠️ Written for target — not actively called |

---

## Rules

1. No migration work begins without explicit founder approval.
2. Each migration step must be atomic and independently verifiable.
3. Current runtime must remain functional throughout migration.
4. Documents must be updated to reflect reality after each migration step.

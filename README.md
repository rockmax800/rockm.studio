# AI Production Studio v1.1 — Spine Stabilized

Deterministic AI-powered software delivery operating system for a solo product founder.

---

## What This Is

A production-grade orchestration system that routes client briefs through a deterministic pipeline — from intake to deployment — using AI agents under strict founder control.

**Production Mode is the default.** Experimental features are gated behind feature flags and disabled in production.

---

## Architecture: Four Operational Planes

```
┌─────────────────────────────────────────────────────────────┐
│  EXPERIENCE    Founder Dashboard, Pixel Office, Client Portal│
├─────────────────────────────────────────────────────────────┤
│  KNOWLEDGE     Scoring, proposals, prompt versions, learning │
├─────────────────────────────────────────────────────────────┤
│  DELIVERY      Tasks, Runs, Artifacts, Reviews, CI/CD, Deploy│
├─────────────────────────────────────────────────────────────┤
│  INTENT        Intake, Blueprints, Estimates, Launch Gates   │
└─────────────────────────────────────────────────────────────┘
```

**Dependency rule:** Intent → Delivery → Knowledge → Experience. No reverse writes.

---

## Core Capabilities

### Front Office (Intent Plane)
Intake → Blueprint Contract → Estimate Report → Launch Decision → Project

### Deterministic Delivery Core
Task → Run → Artifact → Review → Approval (with rework loop)

### Execution Spine
Run → RepoWorkspace → PullRequest → CheckSuite → Deployment → DomainBinding

### Infrastructure
- **Event Log** — append-only canonical truth (immutable, never updated)
- **Transactional Outbox** — reliable external event dispatch
- **Sandbox Isolation** — Docker-based execution with resource limits
- **Optimistic Locking** — version-based concurrency on all entities

### Deployment Pipeline
GitHub → CI (GitHub Actions) → Docker → VPS. Auto-deploy to production is forbidden.

### Governance
- Founder approval gates at every critical transition
- Role Contracts with enforceable path boundaries
- Typed Artifact evidence model (10 categories)
- Client Portal (read-only project visibility)

### Operating Modes
- **Production (MSOM)** — default. Minimal stable operating mode.
- **Experimental** — enables shadow testing, prompt A/B, model competition.

---

## Minimal Stable Operating Mode (MSOM)

Production Mode disables all experimental subsystems:
- No autonomous task generation
- No prompt A/B experiments
- No model competition
- No shadow testing
- No auto-retry beyond configured policy

Only deterministic delivery operates: Task → Run → Review → Approval → Deploy.

---

## What This Is NOT

- **Not a chat playground.** Agents execute structured tasks, not free-form conversations.
- **Not uncontrolled autonomy.** Every meaningful action requires explicit approval or guard validation.
- **Not auto-deploying AI.** Production deployment always requires founder approval after CI passes.
- **Not a simulation.** This is an operational system with real execution, real artifacts, and real deployments.

---

## Documentation Structure

```
docs/
├── 00-system-overview.md          System architecture & 4 planes
├── core/                          Deterministic engine (Delivery Plane)
│   ├── 01–13                      Lifecycle, state machines, guards, data model,
│   │                              orchestration, event log, operational planes
├── front-office/                  Intent Plane
│   ├── intake, blueprint, estimate, launch, presale, client-portal
├── delivery/                      Execution spine
│   ├── backend, providers, delivery-lane, sandbox, failure, diagnostics
├── company/                       Organizational model (Knowledge/Experience)
├── autonomy/                      Experimental features (gated)
│   ├── 20–27                      Autonomy, prompts, models, learning pipeline
├── business/                      Commercial model
├── product/                       Product direction
└── archive/                       Superseded v1 documents
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind + TypeScript |
| Backend | Lovable Cloud (PostgreSQL + Edge Functions) |
| ORM | Supabase client SDK |
| State | TanStack React Query |
| Routing | React Router v6 |
| CI/CD | GitHub Actions → Docker → VPS |
| Real-time | Supabase Realtime (WebSocket) |

---

## Key Directories

```
src/
├── components/       UI components (AppLayout, Sidebar, StatusBadge)
├── components/ui/    shadcn/ui primitives
├── components/office/ Office visualization
├── pages/            Route-level pages
├── hooks/            Data fetching hooks
├── services/         Business logic services
├── guards/           State transition guards
├── workers/          Background execution (runExecutor)
├── lib/              Utilities
supabase/
├── functions/        Edge functions
├── migrations/       Database migrations
```

---

## Version

**v1.1 — Spine Stabilized.** See `VERSION.md` for changelog.

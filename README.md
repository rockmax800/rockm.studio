# AI Production Studio v2.2 — Adaptive Intelligence

Deterministic AI-powered software delivery operating system with adaptive evolution for a solo product founder.

---

## What This Is

A production-grade orchestration system that routes client briefs through a deterministic pipeline — from Company Lead discussion to deployment — using AI agents under strict founder control. The system can formally reason about its own rules and run controlled experiments to improve, but never self-modifies without founder approval.

**Production Mode is the default.** Experimental and evolution features are gated behind feature flags.

---

## Document Honesty Rule

- Documents describe **current branch reality first**.
- Future architecture is labelled as **planned target state**.
- See `docs/00-runtime-truth.md` for the canonical stack reference.
- See `docs/00-transition-status.md` for migration tracking.

---

## Current Implemented Stack

This is what runs when you check out the repo and start the dev server.

| Layer | Technology |
|-------|-----------|
| Build / Dev Server | Vite 5 |
| Frontend | React 18 + TypeScript + Tailwind CSS + shadcn/ui |
| Routing | React Router 6 (client-side SPA) |
| Client State | TanStack React Query |
| Validation | Zod |
| Data Access | Supabase JS client |
| Backend Functions | Supabase Edge Functions |
| Database | PostgreSQL (Supabase-hosted) |
| Schema Reference | Prisma (schema file only — not runtime ORM) |

### Target Stack (planned, not yet implemented)

| Layer | Planned Technology | Status |
|-------|--------------------|--------|
| Frontend | Next.js (App Router) | ❌ Not started |
| Backend | NestJS (modular monolith) | ❌ Not started |
| ORM | Prisma (runtime client) | ❌ Not started |
| Queue | Redis + BullMQ | ❌ Not started |
| Worker | Separate Node.js process | ❌ Not started |
| Sandbox | Docker (isolated execution) | ❌ Not started |
| Deploy | Docker Compose → VPS | ❌ Not started |

**Architecture lock active.** No stack changes without explicit founder approval.

---

## Architecture: Four Operational Planes + Evolution Layer

```
┌─────────────────────────────────────────────────────────────┐
│  EVOLUTION     Gödel proposals, Darwin experiments, Feedback │
├─────────────────────────────────────────────────────────────┤
│  EXPERIENCE    Founder Dashboard, Spatial Office, Client     │
├─────────────────────────────────────────────────────────────┤
│  KNOWLEDGE     Scoring, proposals, prompt versions, learning │
├─────────────────────────────────────────────────────────────┤
│  DELIVERY      Tasks, Runs, Artifacts, Reviews, CI/CD, Deploy│
├─────────────────────────────────────────────────────────────┤
│  INTENT        Company Lead, Intake, Blueprints, Estimates   │
└─────────────────────────────────────────────────────────────┘
```

**Dependency rule:** Intent → Delivery → Knowledge → Experience → Evolution. No reverse writes. Evolution proposes only — never mutates delivery state directly.

---

## Navigation Structure

### Operations (primary)
| Page | Route | Purpose |
|------|-------|---------|
| Command Center | `/` | **Canonical starting point.** Production pipeline overview, founder inbox, project initiation |
| Company Lead | `/lead` | Step 1 — AI consultation to define scope, estimate cost, assess risk |
| Intake Composer | `/presale/new` | Step 2 — Structured brief extraction, blueprint creation |
| Projects | `/projects` | Project list and project cockpit (projects are outputs of the intake flow) |
| Office | `/office` | Spatial capability rooms with employee visualization |
| Founder | `/founder` | Decision queue (approvals, escalations, risk) |
| System | `/system` | Health, providers, mode, operational trace, docs |

### Management
| Page | Route | Purpose |
|------|-------|---------|
| Teams | `/teams` | Capability teams, team members, hiring & performance |
| Evolution | `/evolution` | Gödel proposals, Darwin experiments, feedback triggers |
| Content | `/smm` | AI-generated content from production events |

### Deep Links (backward-compatible, not primary entry points)
| Page | Route | Note |
|------|-------|------|
| Project Cockpit | `/projects/:id` | Accessible after project creation |
| Employee Profile | `/employees/:id` | Accessible from Teams/Office |
| Team Room | `/team-room?dept=:slug` | Accessible from Teams |
| Client Portal | `/client/:token` | External read-only access |

---

## Canonical Production Path

```
Command Center → Talk to Company Lead (consultation, scope, estimate)
    → Approve Direction → Structured Intake (blueprint extraction)
    → Freeze Blueprint → Create Project → Project Cockpit
    → Office (monitoring) → Founder Approval → Deploy → SMM Content
```

**This is the only production path.** All projects originate from this flow.
The "Skip to Structured Intake" option exists for founders who already know what they want, but the recommended path always starts with Company Lead.

Other routes (Office, Founder, Teams, System) are operational views, not alternative project creation surfaces.

---

## Core Capabilities

### Front Office (Intent Plane)
Company Lead → Intake → Blueprint Contract → Estimate Report → Launch Decision → Project

### Deterministic Delivery Core
Task → Run → Artifact → Review → Approval (with rework loop)

### Execution Spine
Run → RepoWorkspace → PullRequest → CheckSuite → Deployment → DomainBinding

### AI Evolution Layer
- **Gödel Mode** — formal self-modification proposals with constraint proofs
- **Darwin Mode** — controlled mutation experiments with baseline comparison
- **Cybernetic Loop** — anomaly detection generating correction proposals
- **Capability Evolution** — stability scoring and high-performer cloning

All evolution requires evaluation rail pass + founder approval. No silent mutations.

### Hard Enforcement Layer
- Role contract boundary enforcement (path-level restrictions)
- Mandatory artifact gates (Implementation Patch, Review Report, QA Evidence)
- CI pass required for PR merge
- DomainBindingSpec + staging confirmation required for production deploy
- Evolution layer cannot modify task/run state, trigger deploys, or bypass approvals

### Governance
- Unified Approval model (no direct boolean flags)
- Founder approval gates at every critical transition
- Role Contracts with enforceable path boundaries
- Typed Artifact evidence model (10 categories)
- Client Portal (read-only project visibility)
- Full versioning and rollback for prompts, contracts, traits, rubrics, guards

### Operating Modes
- **Production (MSOM)** — default. Minimal stable operating mode.
- **Experimental** — enables shadow testing, prompt A/B, model competition, evolution experiments.

---

## Teams & Employee Model

### Capability Teams
Functional groupings organizing AI employees by competency area. Each team tracks team size, average success rate, and load percentage. High-performing teams can be cloned via CapabilityTemplate.

> **Terminology note:** The codebase may reference `departments` in database tables and legacy hooks. In all UI and documentation, the canonical term is **Team** or **Capability Team**. "Department" is a legacy data-layer term only.

### AI Employees
Each employee has:
- **Identity**: Name, role, seniority, mandatory capability assignment
- **Personality**: MBTI type (with tooltip explanations), nationality (with work-style description)
- **Technical Profile**: Primary/secondary stack, skill levels, DevOps/security awareness
- **Operational Traits**: Risk tolerance, strictness, speed/quality bias, token efficiency
- **Performance Metrics**: Success rate, bug rate, escalation rate, reputation score

### Employee Lifecycle
Created → Active → [Probation | Under Review] → [Active | Terminated]

### Spatial Office
Always-on spatial map rendering one room per capability. Rooms render even when empty (with "Add Member" CTA). Employees appear immediately after assignment without page refresh.

---

## Key Directories

```
src/
├── pages/            Page components (React Router)
├── components/       UI components (shadcn/ui based)
├── hooks/            Data hooks (TanStack Query + Supabase)
├── services/         Service logic
├── lib/              Utilities, personas, config
├── integrations/     Supabase client + generated types
supabase/
├── functions/        Edge Functions (backend logic)
├── migrations/       Database migrations
├── config.toml       Project configuration
prisma/
├── schema.prisma     Schema reference (not runtime ORM)
app/
├── api/              Pre-written route handlers (target architecture, not active)
docs/
├── core/             Deterministic engine (Delivery Plane)
├── front-office/     Intent Plane (including Company Lead)
├── delivery/         Execution spine
├── company/          Organizational model
├── autonomy/         Evolution & experimental features (gated)
├── business/         Commercial model
├── product/          Product direction
└── archive/          Superseded documents
```

---

## Version

**v2.2 — Adaptive Intelligence.** See `VERSION.md` for full changelog.

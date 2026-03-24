# AI Production Studio

Internal agent-first development workspace for turning product ideas into production-ready software.

## Purpose

AI Production Studio is a private development environment for a solo product founder.
It orchestrates AI agents across product planning, frontend delivery, backend implementation, review, testing, and release — reducing dependency on external engineering teams.

## Core Principle

The founder defines goals, constraints, and approval gates.
Agents execute work inside explicit boundaries.
The founder does not manually supervise coding step by step.

---

## Architecture Overview

The system is organized into three layers:

| Layer | Purpose | Docs |
|-------|---------|------|
| **Core** | Projects, tasks, runs, artifacts, reviews | `docs/core/` |
| **Company** | AI employees, HR, talent market, media | `docs/company/` |
| **Autonomy** | Self-improvement, prompt versioning, budget controls | `docs/autonomy/` |

High-level overview: [`docs/00-system-overview-v2.md`](docs/00-system-overview-v2.md)

---

## UI Structure (v2.1)

Navigation is split into **Production** and **Management** sections.

### Production

| Route | Page | What's inside |
|-------|------|---------------|
| `/` | Home | Active projects, draft presales, founder decision queue |
| `/departments` | Departments | Department cards (Mobile Studio, Web Studio, etc.), blueprints, presales |
| `/departments/:slug` | Department Detail | Blueprints tab, presales tab, presale workflow |
| `/projects` | Projects | All projects with state filters |
| `/projects/:id` | Project Detail | Tasks, runs, artifacts, reviews for a single project |
| `/office` | Office | Real-time agent activity visualization |

### Management

| Route | Page | What's inside |
|-------|------|---------------|
| `/founder` | Founder | Approval queue, system stats, autonomy controls |
| `/company` | Company | Internal departments dashboard (HR, Talent Market, Media) |
| `/system` | System | Provider health, system mode, diagnostics |

UI spec: [`docs/13-lovable-ui-spec-v1.md`](docs/13-lovable-ui-spec-v1.md)

---

## Company Page — Internal Departments

The `/company` page is a dashboard with three department cards:

| Department | Badge | Key metrics | Detail view |
|-----------|-------|-------------|-------------|
| **HR Department** | Blue | Employees, Avg Performance, Suggestions | Employee table, system suggestions |
| **AI Talent Market** | Cyan | Ranked models, Experiments, Upgrades | Model benchmarking leaderboard |
| **Media & SMM** | Green | Drafts, Approved, Published | Blog posts, "Generate from Events" CTA |

---

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (Supabase) — database, auth, edge functions, storage
- **State**: TanStack React Query
- **Routing**: React Router v6

Decision log: [`docs/19-tech-stack-decision-v1.md`](docs/19-tech-stack-decision-v1.md)

---

## Documentation Map

### Foundation

| File | Content |
|------|---------|
| `AGENTS.md` | Execution policy for AI agents |
| `docs/00-project-brief.md` | Project intent and scope |
| `docs/00-system-overview-v2.md` | System architecture overview |
| `docs/04-domain-boundaries.md` | Domain map and separation rules |
| `docs/07-system-mode.md` | Operating modes (lean, full, maintenance) |
| `docs/08-feature-flags.md` | Feature flag registry |

### Core Layer — `docs/core/`

| File | Content |
|------|---------|
| `01-project-lifecycle.md` | Project states and transitions |
| `02-domain-boundaries.md` | Entity ownership rules |
| `03-state-machine.md` | State machine definitions |
| `04-data-model.md` | Database schema and relations |
| `05-guard-matrix.md` | Transition guard conditions |
| `06-orchestration-use-cases.md` | Task orchestration patterns |
| `07-backend-architecture.md` | API and service layer design |
| `08-provider-architecture.md` | AI provider routing and fallback |
| `09-performance-scoring.md` | Agent performance metrics |

### Company Layer — `docs/company/`

| File | Content |
|------|---------|
| `10-department-system.md` | Department structure and UI mapping |
| `11-ai-employee-hr-model.md` | AI employee lifecycle (hire, evaluate, replace) |
| `12-load-balancer.md` | Task distribution across agents |
| `13-hiring-market.md` | Model competition and benchmarking |
| `14-performance-rating-engine.md` | Reputation scoring system |
| `15-replacement-engine.md` | Underperformer replacement logic |
| `16-company-blog.md` | AI-generated marketing posts |
| `17-realtime-office.md` | Live office visualization |
| `18-prediction-bottleneck-engine.md` | Bottleneck detection and alerts |

### Autonomy Layer — `docs/autonomy/`

| File | Content |
|------|---------|
| `20-autonomy-layer.md` | Self-execution pipeline |
| `21-lean-mode.md` | Minimal-overhead operating mode |
| `22-prompt-versioning.md` | Prompt A/B testing and versioning |
| `23-model-competition.md` | Model ranking and upgrade suggestions |
| `24-context-compression.md` | Context window optimization |
| `25-spec-to-release-mode.md` | End-to-end autonomous delivery |
| `26-safety-budget-controls.md` | Token budgets and safety limits |

### Cross-cutting

| File | Content |
|------|---------|
| `docs/05-lifecycle-state-machine.md` | Entity state machines |
| `docs/11-ai-agent-instructions.md` | Agent behavior rules |
| `docs/12-ai-collaboration-protocol.md` | Handoff, review, escalation |
| `docs/14-data-model-v1.md` | Full data model reference |
| `docs/21-lifecycle-transition-guards-v1.md` | Guard implementation details |
| `docs/27-operating-modes.md` | Mode switching logic |
| `docs/28-token-economy-and-budgeting.md` | Cost tracking and limits |
| `docs/29-risk-and-safety-matrix.md` | Risk classification |

---

## Key Directories

```
src/
├── components/       # Shared UI components (AppLayout, Sidebar, StatusBadge)
├── components/ui/    # shadcn/ui primitives
├── components/office/# Office visualization components
├── pages/            # Route-level pages
├── pages/control/    # Legacy detail pages (still used for deep links)
├── hooks/            # Data fetching hooks (use-hr-data, use-department-data, etc.)
├── services/         # Business logic services
├── guards/           # State transition guards
├── lib/              # Utilities (api, logger, status helpers)
├── data/             # Mock data for development
├── config/           # Environment config
├── workers/          # Background execution (runExecutor)
supabase/
├── functions/        # Edge functions (blog, HR, predictions, benchmarks)
├── migrations/       # Database migrations (read-only)
├── config.toml       # Project configuration
prisma/
├── schema.prisma     # Prisma schema (reference)
```

---

## Non-goals for V1

- Full autonomy without approval gates
- Production deployment without review
- Multi-tenant SaaS
- Voice-first interaction
- Unrestricted code changes across the repository

# AI Production Studio v2.1 — Structural Integration

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

## Navigation Structure

### Operations
| Page | Route | Purpose |
|------|-------|---------|
| Command Center | `/` | Production pipeline overview, founder inbox, intake launch |
| Projects | `/projects` | Project list and project cockpit |
| Office | `/office` | Capability rooms with employee visualization |
| Founder | `/founder` | Decision queue (approvals, escalations, risk) |
| System | `/system` | Health, providers, mode, audit, docs |

### Management
| Page | Route | Purpose |
|------|-------|---------|
| Teams | `/teams` | Capability pools, team members, hiring & performance |
| Content | `/smm` | AI-generated content from production events |

### Deep Links
| Page | Route |
|------|-------|
| Project Cockpit | `/projects/:id` |
| Employee Profile | `/employees/:id` |
| Team Room | `/team-room?dept=:slug` |
| Intake Composer | `/presale/new` |
| Client Portal | `/client/:token` |

---

## Single Production Path

```
Command Center → Start Intake → Select Capability → Add/Select Employee
→ Start Team Session → Freeze Blueprint → Create Project
→ Project Cockpit → Office (monitoring) → Founder Approval → Deploy
→ SMM Content Draft
```

No alternative paths. All production begins at Command Center.

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

### Hard Enforcement Layer
- Role contract boundary enforcement (path-level restrictions)
- Mandatory artifact gates (Implementation Patch, Review Report, QA Evidence)
- CI pass required for PR merge
- DomainBindingSpec + staging confirmation required for production deploy

### Governance
- Unified Approval model (no direct boolean flags)
- Founder approval gates at every critical transition
- Role Contracts with enforceable path boundaries
- Typed Artifact evidence model (10 categories)
- Client Portal (read-only project visibility)

### Operating Modes
- **Production (MSOM)** — default. Minimal stable operating mode.
- **Experimental** — enables shadow testing, prompt A/B, model competition.

---

## Teams & Employee Model

### Capability Pools
Functional groupings (formerly "departments") that organize AI employees by competency area. Each pool tracks team size, average success rate, and load percentage.

### AI Employees
Each employee has:
- **Identity**: Name, role, seniority, capability assignment
- **Personality**: MBTI type (with tooltip explanations), nationality (with work-style description)
- **Technical Profile**: Primary/secondary stack, skill levels, DevOps/security awareness
- **Operational Traits**: Risk tolerance, strictness, speed/quality bias, token efficiency
- **Performance Metrics**: Success rate, bug rate, escalation rate, reputation score

### Employee Lifecycle
Created → Active → [Probation | Under Review] → [Active | Terminated]

### Hiring Flow
Integrated into Teams page. Manual configuration or AI-generated suggestions. HR proposals appear inline, not on a separate page.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind + TypeScript |
| Backend | Lovable Cloud (PostgreSQL + Edge Functions) |
| Data Access | Supabase client SDK |
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
├── components/teams/  Team management (AddEmployeeDialog, HRProposalCard)
├── pages/            Route-level pages
├── hooks/            Data fetching hooks
├── services/         Business logic services
├── guards/           State transition guards
├── workers/          Background execution (runExecutor)
├── lib/              Utilities (mbtiData, nationalityData, employeeConfig)
supabase/
├── functions/        Edge functions
├── migrations/       Database migrations
docs/
├── core/             Deterministic engine (Delivery Plane)
├── front-office/     Intent Plane
├── delivery/         Execution spine
├── company/          Organizational model
├── autonomy/         Experimental features (gated)
├── business/         Commercial model
├── product/          Product direction
└── archive/          Superseded documents
```

---

## Version

**v2.1 — Structural Integration.** See `VERSION.md` for changelog.

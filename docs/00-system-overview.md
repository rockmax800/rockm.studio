---
layer: cross-cutting
criticality: critical
enabled_in_production: yes
version: v4.2
doc_kind: contract
load_strategy: auto
---

# AI Production Studio — System Overview

## 1 — Identity

AI Production Studio is a deterministic, agent-first software delivery system for a solo product founder. It orchestrates AI agents across intake, planning, implementation, review, testing, and release — with founder approval gates at every critical transition.

**Production Mode is the default.** All experimental features are gated and disabled in production.

---

## 2 — Architecture: Four Operational Planes

```
┌─────────────────────────────────────────────────────────────┐
│            PLANE 4 — EXPERIENCE                             │
│  Founder Dashboard, Pixel Office, Client Portal             │
│  Read-only projections from event_log                       │
├─────────────────────────────────────────────────────────────┤
│            PLANE 3 — KNOWLEDGE                              │
│  Prompt versions, scoring, learning proposals, benchmarks   │
│  Proposes only — never mutates delivery state               │
├─────────────────────────────────────────────────────────────┤
│            PLANE 2 — DELIVERY                               │
│  Projects, Tasks, Runs, Artifacts, Reviews, Approvals       │
│  CI/CD, Deployments, Handoffs, Event Log, Outbox            │
│  Deterministic execution spine                              │
├─────────────────────────────────────────────────────────────┤
│            PLANE 1 — INTENT                                 │
│  Intake, Blueprints, Estimates, Launch Decisions, TaskSpecs │
│  Defines WHAT and WHY — never executes                      │
└─────────────────────────────────────────────────────────────┘
```

**Dependency rule:** `Intent → Delivery → Knowledge → Experience`. No reverse writes allowed.

See `core/13-operational-planes.md` for full entity mapping and dependency matrix.

---

## 3 — Navigation & UX Structure

### 3.1 — Sidebar Navigation

**Operations:**
- Command Center (`/`) — Pipeline overview, founder inbox, intake CTA
- Projects (`/projects`) — Project list and cockpit
- Office (`/office`) — Capability rooms with live employee state
- Founder (`/founder`) — Decision engine (approvals, escalations, risk)
- System (`/system`) — Health, providers, mode, audit

**Management:**
- Teams (`/teams`) — Capability pools, employee table, hiring & performance
- Content (`/smm`) — AI-generated content from production events

### 3.2 — Single Production Path

```
Command Center → Intake → Capability → Employee → Team Session
→ Blueprint → Project → Cockpit → Office → Founder → Deploy → SMM
```

All production begins at Command Center. No alternative entry points.

---

## 4 — Plane 1: Intent

Captures business intent. Defines **what** to build and **why**.

| Entity | Purpose |
|--------|---------|
| `intake_requests` | Client brief capture (via IntakeComposer) |
| `blueprint_contracts` | Structured scope agreement |
| `estimate_reports` | Cost and timeline projections |
| `launch_decisions` | Founder go/no-go gate |
| `presale_sessions` | Pre-engagement scoping |
| `task_specs` | Per-task acceptance criteria and path boundaries |

**Flow:**
```
Client Brief → IntakeRequest → BlueprintContract → EstimateReport → LaunchDecision → Project
```

**Constraint:** Intent Plane does not execute code, modify repositories, or deploy.

---

## 5 — Plane 2: Delivery

The deterministic execution engine.

### 5.1 — Core Workflow

```
Task → Run → Artifact → Review → Approval
  ↑                                  │
  └──── rework loop ────────────────┘
```

All state transitions go through `OrchestrationService` with optimistic locking and serializable isolation.

### 5.2 — Execution Spine

```
Run → RepoWorkspace → PullRequest → CheckSuite → Deployment → DomainBinding
```

### 5.3 — Event Infrastructure

| Entity | Role |
|--------|------|
| `event_log` | **Canonical source of truth** — append-only, immutable |
| `outbox_events` | Delivery channel for external dispatch |
| `activity_events` | Backward-compatible projection |

### 5.4 — Hard Enforcement Layer

| Gate | Blocks |
|------|--------|
| Role contract violation | PR merge |
| Missing mandatory artifact | PR merge |
| CI failure | PR merge |
| Missing DomainBindingSpec | Production deploy |
| Staging not live | Production deploy |

### 5.5 — Failure Handling

Failures classified by `error_class` (guard_error, timeout, provider_error). Stalled runs detected by heartbeat monitoring.

---

## 6 — Plane 3: Knowledge

Advisory only — proposes but never mutates Delivery state.

| Entity | Purpose |
|--------|---------|
| `learning_proposals` | Improvement proposals with evidence pipeline |
| `prompt_versions` | Versioned prompt templates |
| `model_benchmarks` | Provider performance data |
| `evaluation_suites/scenarios/runs/reports/baselines` | Evaluation rail |

**Constraint:** Only write-back is `prompt_versions.is_active` on founder-approved promotion.

---

## 7 — Plane 4: Experience

All user-facing surfaces. Read-only on canonical state.

| Surface | Audience | Route |
|---------|----------|-------|
| Command Center | Founder | `/` |
| Project Cockpit | Founder | `/projects/:id` |
| Office (Production Floor) | Founder | `/office` |
| Decision Engine | Founder | `/founder` |
| Teams Management | Founder | `/teams` |
| Team Room (Sessions) | Founder | `/team-room` |
| Employee Profile | Founder | `/employees/:id` |
| Content & Media | Founder | `/smm` |
| System Admin | Founder | `/system` |
| Client Portal | External clients | `/client/:token` |

---

## 8 — Teams & Employee Model

### 8.1 — Capability Pools

Capability pools (stored as `departments` in DB, displayed as "Capabilities" in UI) organize AI employees by functional area. Each pool shows team size, success rate, and load percentage.

### 8.2 — AI Employees

Employees are configured with:
- Identity (name, role, seniority, capability)
- Personality (MBTI type, nationality)
- Technical profile (stack, skill levels)
- Operational traits (risk tolerance, strictness, speed/quality bias)

### 8.3 — Office Visualization

Office renders capability rooms automatically when employees exist. Each room shows:
- Employee cards with avatar, MBTI tag, nationality flag, performance ring
- Active tasks and load status
- Tooltips with detailed work-style summaries

### 8.4 — Team Room Sessions

Entry: Teams → Select Capability → Select Employee → Start Session.
Sessions use 8/4 split: hero message + live extraction panel.

---

## 9 — Founder Intervention Points

| Action | Automated? |
|--------|------------|
| Launch decision | **No** — founder approval |
| Project activation | **No** — founder approval |
| Architecture decisions | **No** — founder approval |
| Release to production | **No** — founder approval |
| Learning proposal promotion | **No** — founder approval |
| Budget increases | **No** — founder controls |
| Content publishing | **No** — founder approval |

---

## 10 — Production Mode (Default)

| Feature | Production | Experimental |
|---------|-----------|--------------|
| Core delivery pipeline | ✅ | ✅ |
| Scoring & snapshots | ✅ | ✅ |
| Prompt A/B experiments | ❌ | ✅ |
| Model competition | ❌ | ✅ |
| Shadow testing | ❌ | ✅ |
| Autonomous task generation | ❌ | ✅ |
| Context compression | ❌ | ✅ |

---

## 11 — Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind + shadcn/ui + TypeScript |
| Backend | Lovable Cloud (PostgreSQL + Edge Functions) |
| Data Access | Supabase client SDK |
| State | TanStack React Query |
| Routing | React Router v6 |
| Validation | Zod |
| Real-time | Supabase Realtime (WebSocket) |
| CI/CD | GitHub Actions → Docker → VPS |

---

## 12 — Documentation Index

| Document | Plane | Contents |
|----------|-------|----------|
| `00-runtime-truth.md` | Cross-cutting | Canonical runtime stack |
| `core/` | Delivery | State machines, guards, data model, orchestration |
| `front-office/` | Intent | Intake, blueprints, estimates, launch |
| `delivery/` | Delivery | Backend, providers, delivery lane, sandbox |
| `company/` | Knowledge/Experience | Departments, employees, HR, office |
| `autonomy/` | Knowledge | Prompt versioning, model competition, learning |
| `business/` | Cross-cutting | Operating model, pricing, SLA |
| `product/` | Cross-cutting | Vision, roadmap, personas |
| `archive/` | — | Superseded v1 documents |

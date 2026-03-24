---
layer: cross-cutting
criticality: critical
enabled_in_production: yes
version: v5.0
doc_kind: contract
load_strategy: auto
---

# AI Production Studio — System Overview (v2.2)

## 1 — Identity

AI Production Studio is a deterministic, agent-first software delivery system with adaptive evolution for a solo product founder. It orchestrates AI agents across intake, planning, implementation, review, testing, and release — with founder approval gates at every critical transition. The system can reason about its own rules (Gödel Mode) and run controlled experiments (Darwin Mode) while maintaining deterministic delivery guarantees.

**Production Mode is the default.** All experimental features are gated and disabled in production.

---

## 2 — Architecture: Four Operational Planes + Evolution Layer

```
┌─────────────────────────────────────────────────────────────┐
│            EVOLUTION LAYER                                   │
│  Gödel proposals, Darwin experiments, Cybernetic feedback    │
│  Proposes only — requires Evaluation Rail + Founder Approval │
├─────────────────────────────────────────────────────────────┤
│            PLANE 4 — EXPERIENCE                             │
│  Founder Dashboard, Spatial Office, Client Portal            │
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
│  Company Lead, Intake, Blueprints, Estimates, Launch Gates   │
│  Defines WHAT and WHY — never executes                      │
└─────────────────────────────────────────────────────────────┘
```

**Dependency rule:** `Intent → Delivery → Knowledge → Experience`. No reverse writes allowed.

See `core/13-operational-planes.md` for full entity mapping and dependency matrix.

---

## 3 — Navigation & UX Structure

### 3.1 — Sidebar Navigation

**Operations:**
- Command Center (`/`) — Pipeline overview, founder inbox, project initiation via Company Lead
- Company Lead (`/lead`) — AI Delivery Director, first contact for new projects
- Projects (`/projects`) — Project list and cockpit
- Office (`/office`) — Spatial capability rooms (always-on, renders even when empty)
- Founder (`/founder`) — Decision engine (approvals, escalations, risk)
- System (`/system`) — Health, providers, mode, audit

**Management:**
- Teams (`/teams`) — Capability pools, employee table, hiring & performance
- Evolution (`/evolution`) — Gödel proposals, Darwin experiments, feedback triggers, capability cloning
- Content (`/smm`) — AI-generated content from production events

### 3.2 — Single Production Path

```
Command Center → Company Lead Discussion → Scope Extraction → Internal Consultation
→ Cost/Token Estimate → Founder Decision → Create Blueprint
→ Capability → Employee → Team Session → Blueprint Freeze → Project
→ Cockpit → Office → Founder → Deploy → SMM
```

All production begins at Command Center via Company Lead. No alternative entry points.

---

## 4 — Plane 1: Intent

Captures business intent. Defines **what** to build and **why**. Entry point is Company Lead.

| Entity | Purpose |
|--------|---------|
| Company Lead Session | AI Delivery Director conversation with structured extraction |
| `intake_requests` | Client brief capture (via IntakeComposer) |
| `blueprint_contracts` | Structured scope agreement |
| `estimate_reports` | Cost and timeline projections |
| `launch_decisions` | Founder go/no-go gate |
| `presale_sessions` | Pre-engagement scoping |
| `task_specs` | Per-task acceptance criteria and path boundaries |

**Flow:**
```
Company Lead Discussion → Scope Extraction + Internal Consultation
→ Estimate → Founder Decision → IntakeRequest → BlueprintContract
→ EstimateReport → LaunchDecision → Project
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

## 8 — Company Lead (AI Delivery Director)

The Company Lead is the single orchestration entry point for all new projects:

| Phase | Description |
|-------|-------------|
| Discovery | Structured Q&A extracting goal, constraints, scope, modules, risk |
| Internal Consultation | Simulated structured feedback from Architect, QA, Reviewer |
| Estimate | Module breakdown with token budgets, cost, timeline, team composition |
| Decision | Founder approves (→ Blueprint), revises scope, or cancels |

Layout: 8/4 asymmetric grid — chat conversation on left, live structured extraction on right.

Rules:
- Structured conversation, not casual chat
- No emoji, no marketing fluff
- Deterministic extraction of scope artifacts
- Internal consultation is summarized, not chaotic

---

## 9 — Teams & Employee Model

### 9.1 — Capability Pools

Capability pools (stored as `departments` in DB, displayed as "Capabilities" in UI) organize AI employees by functional area. Each pool shows team size, success rate, and load percentage. High-performing capabilities can be cloned via CapabilityTemplate.

### 9.2 — AI Employees

Employees are configured with:
- Identity (name, role, seniority, mandatory capability assignment)
- Personality (MBTI type, nationality)
- Technical profile (stack, skill levels)
- Operational traits (risk tolerance, strictness, speed/quality bias)

### 9.3 — Spatial Office

Office always renders spatial map with one room per capability. Rooms render even when empty (with "Add Member" CTA). Each room shows:
- Employee cards with avatar, MBTI tag, nationality flag, performance ring
- Active tasks and load status
- Tooltips with detailed work-style summaries

### 9.4 — Mandatory Capability Assignment

Employee creation requires capability selection. After creation or assignment:
- Teams page refreshes immediately
- Office rooms update immediately
- Capability view updates immediately
- No page reload required

### 9.5 — Team Room Sessions

Entry: Teams → Select Capability → Select Employee → Start Session.
Sessions use 8/4 split: hero message + live extraction panel.

---

## 10 — AI Evolution Layer

Adaptive intelligence with strict safety guarantees. All evolution is observable and reversible.

### 10.1 — Gödel Mode (Formal Self-Modification)

System reasons about its own contracts, prompts, rules, and policies. Creates `SelfModificationProposal` with:
- Target component (prompt, rubric, guard, contract, retrieval_rule)
- Formal reasoning summary and constraint preservation proof
- Expected improvement and impact scope
- Safety flags

Status flow: candidate → evaluated → approved → promoted (or rejected)

### 10.2 — Darwin Mode (Mutation & Selection)

Controlled experiments creating small variations. `MutationExperiment` tracks:
- Base version vs mutated version
- Mutation type (prompt tweak, trait shift, stack change, routing change)
- Pass rate, performance delta, token delta, cost delta

Promotion requires: pass_rate > baseline, protected scenarios pass, no critical regression, founder approval.

### 10.3 — Cybernetic Feedback Loop

Monitors: rework rate, escalation frequency, CI failures, eval failures, deploy rollbacks, token inefficiency. Generates `CorrectionProposal` on anomaly detection. No automatic enforcement.

### 10.4 — Capability Evolution

Each capability tracks performance trend, avg eval pass rate, stability score, risk drift. Stable high-performers can be cloned via `CapabilityTemplate`.

### 10.5 — Safety Guarantees

Forbidden: direct prompt overwrite, auto contract changes, auto stack replacement, hidden trait modifications, silent mutation, self-edit without audit trail. Evolution layer NEVER modifies task/run state, triggers deploy, bypasses approval, or skips evaluation.

### 10.6 — Versioning & Rollback

Every prompt, role contract, trait configuration, rubric, and guard rule is versioned. Every promotion stores the previous version and allows rollback.

---

## 11 — Founder Intervention Points

| Action | Automated? |
|--------|------------|
| Launch decision | **No** — founder approval |
| Project activation | **No** — founder approval |
| Architecture decisions | **No** — founder approval |
| Release to production | **No** — founder approval |
| Learning proposal promotion | **No** — founder approval |
| Budget increases | **No** — founder controls |
| Content publishing | **No** — founder approval |
| Evolution proposal promotion | **No** — founder approval |
| Mutation experiment promotion | **No** — founder approval |
| Capability cloning | **No** — founder approval |

---

## 12 — Production Mode (Default)

| Feature | Production | Experimental |
|---------|-----------|--------------|
| Core delivery pipeline | ✅ | ✅ |
| Scoring & snapshots | ✅ | ✅ |
| Prompt A/B experiments | ❌ | ✅ |
| Model competition | ❌ | ✅ |
| Shadow testing | ❌ | ✅ |
| Autonomous task generation | ❌ | ✅ |
| Context compression | ❌ | ✅ |
| Gödel Mode proposals | ❌ | ✅ |
| Darwin Mode experiments | ❌ | ✅ |
| Cybernetic feedback loop | ✅ (monitoring only) | ✅ (full) |
| Capability cloning | ❌ | ✅ |

---

## 13 — Technology Stack (LOCKED)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui | No standalone Vite or React |
| Backend | NestJS + TypeScript | Modular monolith |
| Database | PostgreSQL + Prisma | Prisma is the only ORM |
| Queue | Redis + BullMQ | Job queue, retry, scheduling |
| Worker | Separate Node.js process | RunExecutor, sandbox orchestration |
| Sandbox | Docker | Isolated code execution |
| State (client) | TanStack React Query | Server-state cache |
| Validation | Zod | Shared client + server |
| CI | GitHub Actions | PR checks |
| Deployment | Docker → VPS | Single-server Docker Compose |

**Architecture lock active.** No stack substitutions without explicit founder unlock.

---

## 14 — Documentation Index

| Document | Plane | Contents |
|----------|-------|----------|
| `00-runtime-truth.md` | Cross-cutting | Canonical runtime stack |
| `core/` | Delivery | State machines, guards, data model, orchestration |
| `front-office/` | Intent | Intake, blueprints, estimates, launch |
| `delivery/` | Delivery | Backend, providers, delivery lane, sandbox |
| `company/` | Knowledge/Experience | Departments, employees, HR, office |
| `autonomy/` | Knowledge/Evolution | Prompt versioning, model competition, learning, evolution |
| `business/` | Cross-cutting | Operating model, pricing, SLA |
| `product/` | Cross-cutting | Vision, roadmap, personas |
| `archive/` | — | Superseded v1 documents |

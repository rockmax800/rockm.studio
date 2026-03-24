---
layer: cross-cutting
criticality: critical
enabled_in_production: yes
version: v4.1
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

## 3 — Plane 1: Intent

Captures business intent before and during execution. Defines **what** to build and **why**.

| Entity | Purpose |
|--------|---------|
| `intake_requests` | Client brief capture |
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

## 4 — Plane 2: Delivery

The deterministic execution engine.

### 4.1 — Core Workflow

```
Task → Run → Artifact → Review → Approval
  ↑                                  │
  └──── rework loop ────────────────┘
```

All state transitions go through `OrchestrationService` with optimistic locking and serializable isolation.

### 4.2 — Execution Spine

```
Run → RepoWorkspace → PullRequest → CheckSuite → Deployment → DomainBinding
```

Each step produces typed artifacts for full traceability. See `core/11-artifact-type-system.md`.

### 4.3 — Event Infrastructure

| Entity | Role |
|--------|------|
| `event_log` | **Canonical source of truth** — append-only, immutable |
| `outbox_events` | Delivery channel for external dispatch |
| `activity_events` | Backward-compatible projection |

All three are written atomically within the same transaction as the state change. See `core/12-event-log-architecture.md`.

### 4.4 — Runtime Separation

The system runs as two separate processes with strict boundaries:

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

Control Plane never executes code. Execution Plane never renders UI. Communication only via PostgreSQL. See `delivery/runtime-and-secret-governance.md`.

### 4.5 — Execution Isolation

Runs execute inside Docker-based sandboxes with resource limits (CPU, memory, timeout, network). Sandbox containers never have production deploy credentials. See `delivery/sandbox-and-execution-isolation.md`.

### 4.6 — Failure Handling

Failures are classified by `error_class` (guard_error, timeout, provider_error, etc.) and recorded with `failure_reason`. Stalled runs are detected by heartbeat monitoring. See `delivery/failure-classification.md`.

### 4.7 — Reproducibility

Every run captures a `context_pack` with content hash, source versions, and included artifacts — enabling exact replay. See `delivery/context-reproducibility.md`.

### Key Documents

| Document | Purpose |
|----------|---------|
| `core/01-project-lifecycle.md` | Project states and transitions |
| `core/02-domain-boundaries.md` | 14 domains with isolation rules |
| `core/03-state-machine.md` | All entity state machines |
| `core/04-data-model.md` | Entity schema |
| `core/05-guard-matrix.md` | Transition guards |
| `core/06-orchestration-use-cases.md` | 26 atomic workflow actions |
| `core/10-role-contracts-and-taskspec.md` | Enforceable role boundaries |
| `delivery/delivery-lane.md` | PR → CI → Staging → Production |
| `delivery/runtime-and-secret-governance.md` | Runtime separation and secret injection |

---

## 5 — Plane 3: Knowledge

Learning, improvement proposals, and performance measurement. All Knowledge Plane operations are **advisory only** — they propose but never directly mutate Delivery state.

| Entity | Purpose |
|--------|---------|
| `learning_proposals` | Formal improvement proposals with evidence pipeline |
| `prompt_versions` | Versioned prompt templates |
| `model_benchmarks` | Provider model performance data |
| `bottleneck_predictions` | Proactive risk detection |
| `context_snapshots` | Reproducibility snapshots |

**Learning Pipeline:** Candidate → Evaluated → (Shadow) → Approved → Promoted. Requires ≥3 source runs, statistical significance, and founder approval. See `autonomy/27-learning-pipeline.md`.

**Constraint:** Knowledge Plane never updates tasks, runs, or artifacts. The only write-back is `prompt_versions.is_active` on founder-approved promotion.

---

## 6 — Plane 4: Experience

All user-facing surfaces. Read-only on canonical state.

| Surface | Audience |
|---------|----------|
| Founder Dashboard | Founder — project oversight and approval |
| Pixel Office | Founder — real-time agent visualization |
| Client Portal | External clients — filtered read-only view |
| System Diagnostics | Founder — operational health monitoring |

**Constraint:** Experience Plane does not write `event_log`, mutate entity state, or trigger transitions. User actions (approve, reject, assign) route through Delivery Plane APIs.

---

## 7 — Founder Intervention Points

| Action | Plane | Automated? |
|--------|-------|------------|
| Launch decision | Intent | **No** — founder approval |
| Project activation | Delivery | **No** — founder approval |
| Architecture decisions | Delivery | **No** — founder approval |
| Release to production | Delivery | **No** — founder approval |
| Learning proposal promotion | Knowledge | **No** — founder approval |
| Budget increases | Knowledge | **No** — founder controls |

---

## 8 — Production Mode (Default)

Production Mode (MSOM) is the system default. It disables all experimental subsystems:

| Feature | Production | Experimental |
|---------|-----------|--------------|
| Core delivery pipeline | ✅ Active | ✅ Active |
| Scoring & snapshots | ✅ Active | ✅ Active |
| Prompt A/B experiments | ❌ Disabled | ✅ Active |
| Model competition | ❌ Disabled | ✅ Active |
| Shadow testing | ❌ Disabled | ✅ Active |
| Autonomous task generation | ❌ Disabled | ✅ Active |
| Context compression | ❌ Disabled | ✅ Active |

See `core/07-system-mode.md` and `core/08-feature-flags.md`.

---

## 9 — Documentation Index

| Folder | Plane | Contents |
|--------|-------|----------|
| `core/` | Delivery | State machines, guards, data model, orchestration, event log, planes |
| `front-office/` | Intent | Intake, blueprints, estimates, launch decisions, client portal |
| `delivery/` | Delivery | Backend architecture, providers, delivery lane, sandbox, diagnostics |
| `company/` | Knowledge/Experience | Departments, employees, HR, office, blog |
| `autonomy/` | Knowledge | Prompt versioning, model competition, learning pipeline (gated) |
| `business/` | Cross-cutting | Operating model, pricing, SLA, revenue |
| `product/` | Cross-cutting | Vision, roadmap, personas, constraints |
| `archive/` | — | Superseded v1 documents (not authoritative) |

---

## 10 — Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind + TypeScript |
| Backend | Lovable Cloud (PostgreSQL + Edge Functions) |
| ORM | Supabase client SDK |
| Validation | Zod |
| Real-time | Supabase Realtime (WebSocket) |
| CI/CD | GitHub Actions → Docker → VPS |

---

## 11 — Archive

Superseded documents are preserved in `archive/` for historical reference. They are not authoritative and must not be used for implementation decisions.

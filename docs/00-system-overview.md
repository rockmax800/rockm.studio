---
layer: cross-cutting
criticality: critical
enabled_in_production: yes
version: v4.0
---

# AI Production Studio — System Overview

## 1 — Identity

AI Production Studio is an agent-first development workspace for a solo product founder. It orchestrates AI agents across intake, planning, implementation, review, testing, and release — with founder approval gates at every critical point.

---

## 2 — Architecture: Four Operational Planes

```
┌─────────────────────────────────────────────────────────────┐
│            PLANE 4 — EXPERIENCE                             │
│  Pixel Office, Founder Dashboard, Client Portal             │
│  Read-only projections from event_log                       │
├─────────────────────────────────────────────────────────────┤
│            PLANE 3 — KNOWLEDGE                              │
│  Prompt versions, context snapshots, scoring, benchmarks    │
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

**Dependency rule:** `Intent → Delivery → Knowledge → Experience`. No reverse dependency allowed.

---

## 3 — Plane 1: Intent

Captures the business intent before and during execution. Defines **what** to build and **why**.

| Entity | Purpose |
|--------|---------|
| `intake_requests` | Client brief capture |
| `blueprint_contracts` | Structured scope agreement |
| `estimate_reports` | Cost and timeline projections |
| `launch_decisions` | Founder go/no-go gate |
| `presale_sessions` | Lightweight pre-engagement scoping |
| `task_specs` | Structured acceptance criteria per task |

**Constraints:** Intent Plane must NOT execute code, modify repositories, or deploy.

**Flow:**
```
Client Brief → IntakeRequest → BlueprintContract → EstimateReport → LaunchDecision → Project
                                                                                       ↓
                                                              TaskSpec ← Task (created in Delivery)
```

---

## 4 — Plane 2: Delivery

The deterministic execution engine. Defines **how** things are built.

### 4.1 — Core Workflow Entities

| Entity | Purpose |
|--------|---------|
| `projects` | Top-level container with lifecycle |
| `tasks` | Units of work within a project |
| `runs` | Execution attempts on a task |
| `artifacts` | Typed evidence outputs |
| `reviews` | Quality verification |
| `approvals` | Founder decision gates |
| `handoffs` | Role-to-role responsibility transfer |

**Core workflow:**
```
Task → Run → Artifact → Review → Approval
  ↑                                  │
  └──── rework loop ────────────────┘
```

### 4.2 — Delivery Spine Entities

| Entity | Purpose |
|--------|---------|
| `repo_workspaces` | Isolated git worktrees |
| `pull_requests` | Code review units |
| `check_suites` | CI pipeline results |
| `deployments` | Release to environment |
| `domain_bindings` | DNS/TLS configuration |
| `sandbox_policies` | Execution isolation rules |

**Delivery spine:**
```
Run → RepoWorkspace → PullRequest → CheckSuite → Deployment → DomainBinding
```

### 4.3 — Event Infrastructure

| Entity | Role |
|--------|------|
| `event_log` | **Canonical source of truth** — append-only, immutable |
| `outbox_events` | Delivery channel for external dispatch |
| `activity_events` | Backward-compatible projection |
| `office_events` | Office visualization projection |

### 4.4 — Key Documents

| Document | Purpose |
|----------|---------|
| `core/01-project-lifecycle.md` | Project states and transitions |
| `core/02-domain-boundaries.md` | 14 domains with isolation rules |
| `core/03-state-machine.md` | All entity state machines |
| `core/04-data-model.md` | Entity schema |
| `core/05-guard-matrix.md` | Transition guards and preconditions |
| `core/06-orchestration-use-cases.md` | 26 atomic workflow actions |
| `core/07-system-mode.md` | Production/Experimental mode |
| `core/10-role-contracts-and-taskspec.md` | Enforceable role boundaries |
| `core/11-artifact-type-system.md` | Typed evidence model |
| `core/12-event-log-architecture.md` | Canonical event log |
| `delivery/delivery-lane.md` | PR → CI → Staging → Production |
| `delivery/sandbox-and-execution-isolation.md` | Docker-based run isolation |
| `delivery/failure-classification.md` | Standardized error_class values |

---

## 5 — Plane 3: Knowledge

Learning, improvement proposals, and performance measurement. All Knowledge Plane operations are **advisory only** — they propose changes but never mutate Delivery state directly.

| Entity / Concept | Purpose |
|-------------------|---------|
| `prompt_versions` | Versioned prompt templates |
| `prompt_experiments` | A/B testing of prompts |
| `context_snapshots` | Reproducibility snapshots |
| `context_packs` | Assembled execution context |
| `model_benchmarks` | Provider model performance data |
| `model_market` | Available models registry |
| `performance scoring` | Quality/cost/latency formulas |
| `bottleneck_predictions` | Proactive risk detection |
| `hr_suggestions` | Employee improvement proposals |
| `prompt_improvement_suggestions` | Prompt optimization proposals |

**Constraints:** Knowledge Plane must NOT update task state, transition runs, or modify artifacts. It may only INSERT proposals and scoring records.

### Key Documents

| Document | Purpose |
|----------|---------|
| `core/09-performance-scoring.md` | Scoring formulas |
| `autonomy/22-prompt-versioning.md` | Prompt version management |
| `autonomy/23-model-competition.md` | Internal model benchmarking |
| `autonomy/24-context-compression.md` | Token-efficient context |
| `company/14-performance-rating-engine.md` | Quality scoring |
| `company/18-prediction-bottleneck-engine.md` | Proactive detection |

---

## 6 — Plane 4: Experience

All user-facing surfaces. Experience Plane is **read-only** — it reads projections built from `event_log` and entity state, but never writes canonical state.

| Surface | Audience | Source |
|---------|----------|--------|
| Founder Dashboard | Founder | Delivery entities + event_log projections |
| Pixel Office | Founder | office_events + agent state |
| Client Portal | External clients | Filtered project state + milestones |
| Company Dashboard | Founder | Knowledge + Company entities |
| Blog | Public | blog_posts (Company layer) |

**Constraints:** Experience Plane must NOT write to `event_log`, mutate entity state, or trigger transitions. User actions (approve, reject, assign) are routed through Delivery Plane APIs.

### Key Documents

| Document | Purpose |
|----------|---------|
| `company/17-realtime-office.md` | Pixel visualization, zone mapping |
| `front-office/client-portal.md` | Read-only external project view |

---

## 7 — Data Flow Between Planes

```
INTENT                    DELIVERY                  KNOWLEDGE             EXPERIENCE
  │                          │                          │                      │
  │  blueprint_contract ──→  │                          │                      │
  │  task_spec ──────────→   │                          │                      │
  │  launch_decision ────→   │                          │                      │
  │                          │                          │                      │
  │                          │  run results ──────────→ │                      │
  │                          │  scoring data ─────────→ │                      │
  │                          │                          │                      │
  │                          │  event_log ─────────────────────────────────→   │
  │                          │  entity state (read) ───────────────────────→   │
  │                          │                          │                      │
  │                          │  ←── proposals ────────  │                      │
  │                          │  ←── suggestions ──────  │                      │
  │                          │                          │                      │
  │                          │  ←──── user actions (approve, assign) ──────    │
```

---

## 8 — Founder Intervention Points

| Action | Plane | Automated? |
|--------|-------|------------|
| Launch decision | Intent | **No** — founder approval |
| Project activation | Delivery | **No** — founder approval |
| Architecture decisions | Delivery | **No** — founder approval |
| Release approval | Delivery | **No** — founder approval |
| HR proposals | Knowledge | **No** — founder approval |
| Blog publishing | Experience | **No** — founder approval |
| Budget increases | Knowledge | **No** — founder controls |

---

## 9 — Production Mode Boundaries

| Plane | Production Mode | Experimental Mode |
|-------|----------------|-------------------|
| Intent | Full | Full |
| Delivery | Full | Full |
| Knowledge | Scoring + snapshots only | Full (A/B, competition, compression) |
| Experience | Full | Full + autonomy indicators |

---

## 10 — Technology Stack

- **Frontend:** React + Vite + Tailwind + TypeScript
- **Backend:** Lovable Cloud (PostgreSQL + Edge Functions)
- **ORM:** Supabase client SDK
- **Validation:** Zod
- **Real-time:** Supabase Realtime (WebSocket)
- **CI/CD:** GitHub Actions → Docker → VPS

---

## 11 — Archive

Superseded documents are preserved in `archive/` for historical reference. They are not authoritative and must not be used for implementation decisions.

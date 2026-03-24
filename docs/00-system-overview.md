---
layer: cross-cutting
criticality: critical
enabled_in_production: yes
version: v3.0
---

# AI Production Studio — System Overview

## 1 — Identity

AI Production Studio is an agent-first development workspace for a solo product founder. It orchestrates AI agents across intake, planning, implementation, review, testing, and release — with founder approval gates at every critical point.

---

## 2 — Architecture: Four Planes

```
┌─────────────────────────────────────────────────────────────┐
│              PLANE 4 — AUTONOMY LAB                         │
│  Prompt evolution, model competition, context compression   │
│  ⚠ Disabled in Production Mode                              │
├─────────────────────────────────────────────────────────────┤
│              PLANE 3 — COMPANY LAYER                        │
│  Departments, AI employees, HR, hiring, office, blog        │
├─────────────────────────────────────────────────────────────┤
│              PLANE 2 — DELIVERY CORE                        │
│  Backend services, providers, execution, CI/CD, deployment  │
├─────────────────────────────────────────────────────────────┤
│              PLANE 1 — FRONT OFFICE                         │
│  Intake, blueprints, estimates, launch decisions, portal    │
└─────────────────────────────────────────────────────────────┘

         ┌──────────────────────────────────┐
          │      CORE ENGINE (Foundation)    │
          │  Projects, Tasks, Runs, Reviews  │
          │  State Machine, Guards, Events   │
          │  Event Log (canonical truth)     │
          └──────────────────────────────────┘
```

**Dependency rule:** Lower planes never depend on upper planes. Core Engine is the shared foundation.

---

## 3 — Plane 1: Front Office

Client-facing lifecycle before project creation.

| Document | Purpose |
|----------|---------|
| `front-office/intake-request.md` | Client brief capture |
| `front-office/blueprint-contract.md` | Structured scope agreement |
| `front-office/estimate-report.md` | Cost and timeline projections |
| `front-office/launch-decision.md` | Founder go/no-go gate |
| `front-office/presale-session.md` | Lightweight pre-engagement scoping |
| `front-office/client-portal.md` | Read-only external project view |

**Flow:**
```
Client Brief → IntakeRequest → BlueprintContract → EstimateReport → LaunchDecision → Project
```

---

## 4 — Core Engine

The deterministic workflow backbone shared by all planes.

| Document | Purpose |
|----------|---------|
| `core/01-project-lifecycle.md` | Project states and transitions |
| `core/02-domain-boundaries.md` | 14 domains with isolation rules |
| `core/03-state-machine.md` | All entity state machines |
| `core/04-data-model.md` | Entity schema |
| `core/05-guard-matrix.md` | Transition guards and preconditions |
| `core/06-orchestration-use-cases.md` | 26 atomic workflow actions |
| `core/07-system-mode.md` | Production/Experimental mode |
| `core/08-feature-flags.md` | Feature flag definitions |
| `core/09-performance-scoring.md` | All scoring formulas |

**Core workflow:**
```
Task → Run → Artifact → Review → Approval
  ↑                                  │
  └──── rework loop ────────────────┘
```

---

## 5 — Plane 2: Delivery Core

Execution spine from code to production.

| Document | Purpose |
|----------|---------|
| `delivery/backend-architecture.md` | Service map, guards, transactions |
| `delivery/provider-architecture.md` | Multi-provider routing and fallback |
| `delivery/delivery-lane.md` | PR → CI → Staging → Production pipeline |
| `delivery/sandbox-and-execution-isolation.md` | Docker-based run isolation |
| `delivery/failure-classification.md` | Standardized error_class values |
| `delivery/operational-diagnostics.md` | Worker monitoring and stalled detection |
| `delivery/context-reproducibility.md` | Snapshot semantics for reproducible runs |
| `delivery/risk-and-safety-matrix.md` | Risk categorization and mitigation |

**Delivery spine:**
```
Run → RepoWorkspace → PullRequest → CheckSuite → Deployment → DomainBinding
```

---

## 6 — Plane 3: Company Layer

Organizational simulation on top of Core Engine.

| Document | Purpose |
|----------|---------|
| `company/10-department-system.md` | Teams and cross-team policies |
| `company/11-ai-employee-hr-model.md` | Named employees, hiring, performance |
| `company/12-load-balancer.md` | Task distribution scoring |
| `company/13-hiring-market.md` | Model marketplace |
| `company/14-performance-rating-engine.md` | Quality scoring |
| `company/15-replacement-engine.md` | Employee replacement proposals |
| `company/16-company-blog.md` | AI copywriter, event-driven drafts |
| `company/17-realtime-office.md` | Pixel visualization, zone mapping |
| `company/18-prediction-bottleneck-engine.md` | Proactive bottleneck detection |

**Company layer does NOT redefine lifecycle or core guards.**

---

## 7 — Plane 4: Autonomy Lab

Controlled self-improvement. All features disabled in Production Mode.

| Document | Purpose |
|----------|---------|
| `autonomy/20-autonomy-layer.md` | Idea generation, autonomous execution |
| `autonomy/21-lean-mode.md` | Minimal token usage mode |
| `autonomy/22-prompt-versioning.md` | Prompt versions, A/B experiments |
| `autonomy/23-model-competition.md` | Internal model benchmarking |
| `autonomy/24-context-compression.md` | Token-efficient context assembly |
| `autonomy/25-spec-to-release-mode.md` | End-to-end autonomous delivery |
| `autonomy/26-safety-budget-controls.md` | Budget limits, kill switches |

---

## 8 — Business & Product Layers

Strategic and commercial documentation.

| Folder | Documents |
|--------|-----------|
| `business/` | operating-model, service-offerings, pricing-strategy, client-engagement-model, delivery-sla, risk-allocation, revenue-tracking, token-economy-and-budgeting |
| `product/` | product-vision, user-personas, roadmap, release-plan, differentiation, constraints |

---

## 9 — Event Architecture

All state transitions emit `ActivityEvent` (audit) + `OutboxEvent` (dispatch).

| Layer | Events |
|-------|--------|
| Core | `project.*`, `task.*`, `run.*`, `artifact.*`, `review.*`, `approval.*` |
| Company | `employee.*`, `office.*`, `blog.*`, `hr.*` |
| Autonomy | `autonomy.*`, `experiment.*` |

Events are append-only. No updates, no deletes.

---

## 10 — Founder Intervention Points

| Action | Layer | Automated? |
|--------|-------|------------|
| Launch decision | Front Office | **No** — founder approval |
| Project activation | Core | **No** — founder approval |
| Architecture decisions | Core | **No** — founder approval |
| Release approval | Delivery | **No** — founder approval |
| HR proposals | Company | **No** — founder approval |
| Blog publishing | Company | **No** — founder approval |
| Budget increases | Autonomy | **No** — founder controls |

---

## 11 — Technology Stack

- **Frontend:** React + Vite + Tailwind + TypeScript
- **Backend:** Lovable Cloud (PostgreSQL + Edge Functions)
- **ORM:** Supabase client SDK
- **Validation:** Zod
- **Real-time:** Supabase Realtime (WebSocket)
- **CI/CD:** GitHub Actions → Docker → VPS

---

## 12 — Archive

Superseded documents are preserved in `archive/` for historical reference. They are not authoritative and must not be used for implementation decisions.

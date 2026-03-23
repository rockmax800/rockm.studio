---
layer: cross-cutting
criticality: critical
enabled_in_production: yes
---

# 00 — System Overview V2

## 1 — System Identity

**AI Workshop OS** is an internal agent-first development workspace for a solo product founder.
It orchestrates AI agents across product planning, frontend delivery, backend implementation, review, testing, and release preparation.

---

## 2 — Architecture Layers

The system is organized into three layers with clear dependency rules:

```
┌─────────────────────────────────────────────────────┐
│           LAYER 3 — AUTONOMY & EVOLUTION            │
│  Controlled autonomy, prompt evolution, budgets     │
│  ↓ depends on ↓                                     │
├─────────────────────────────────────────────────────┤
│           LAYER 2 — COMPANY LAYER                   │
│  Teams, employees, HR, hiring, office, blog         │
│  ↓ depends on ↓                                     │
├─────────────────────────────────────────────────────┤
│           LAYER 1 — CORE ENGINE                     │
│  Projects, Tasks, Runs, Artifacts, Reviews,         │
│  Approvals, Guards, Orchestration, Providers        │
└─────────────────────────────────────────────────────┘
```

**Dependency rule:** Lower layers never depend on upper layers. Layer 1 operates independently.

---

## 3 — Layer 1 — Core Engine (Documents 01–09)

The deterministic workflow backbone. No HR, no autonomy, no departments.

| Doc | Title | Purpose |
|-----|-------|---------|
| 01 | Project Lifecycle | Project creation, scoping, activation, completion, archival |
| 02 | Domain Boundaries | 14 domains with isolation rules and interaction contracts |
| 03 | State Machine | States and transitions for Project, Task, Run, Artifact, Review, Approval |
| 04 | Data Model | Core entity schema: fields, relationships, invariants |
| 05 | Guard Matrix | Transition guards with preconditions, side effects, forbidden states |
| 06 | Orchestration Use Cases | 26 atomic workflow actions (UC-01 through UC-26) |
| 07 | Backend Architecture | Service map, guard layer, transaction design, worker layer |
| 08 | Provider Architecture | Multi-provider routing, credentials, health, usage, fallback |
| **09** | **Performance Scoring** | **Single source of truth for all scoring formulas** |

**Core workflow chain:**
```
Task → Run → Artifact → Review → Approval
  ↑                                  │
  └──── rework loop ────────────────┘
```

---

## 4 — Layer 2 — Company Layer (Documents 10–18)

Organizational simulation on top of Core Engine.

| Doc | Title | Purpose |
|-----|-------|---------|
| 10 | Department System | Teams, team settings, cross-team policies |
| 11 | AIEmployee & HR Model | Named employees, hiring, performance tracking |
| 12 | Load Balancer | Task distribution — scoring via `core/09` |
| 13 | Hiring Market | Model marketplace — scoring via `core/09` |
| 14 | Performance & Rating Engine | Quality scoring — formula via `core/09` |
| 15 | Replacement Engine | Employee replacement proposals with founder approval |
| 16 | Company Blog Module | AI copywriter, event-driven drafts, founder approval |
| 17 | Real-Time Office | Pixel visualization, zone mapping, office events |
| 18 | Prediction & Bottleneck Engine | Proactive bottleneck detection, confidence scoring |

**Company layer does NOT define state transitions or override core guards.**

---

## 5 — Layer 3 — Autonomy & Evolution (Documents 20–26)

Controlled self-improvement and experimental features.

| Doc | Title | Purpose |
|-----|-------|---------|
| 20 | Autonomy Layer | Idea generation, task creation, execution pipeline |
| 21 | Lean Mode | Minimal operating mode with reduced token usage |
| 22 | Prompt Versioning | Prompt versions, A/B experiments, rollback |
| 23 | Model Competition | Internal model competition for hiring decisions |
| 24 | Context Compression | Token-efficient context assembly |
| 25 | Spec-to-Release Mode | End-to-end autonomous delivery pipeline |
| 26 | Safety & Budget Controls | Budget limits, runaway prevention, kill switches |

**Autonomy layer does NOT redefine lifecycle or data model.** References core exclusively.

---

## 6 — Cross-Cutting Documents

| Doc | Title | Purpose |
|-----|-------|---------|
| 07-system-mode | System Mode | Production/Experimental mode control |
| 08-feature-flags | Feature Flags | Experimental feature flag definitions |
| 27 | Operating Modes | Four mode configurations |
| 28 | Token Economy | Cost analysis and budget hierarchy |
| 29 | Risk & Safety Matrix | Risk categorization and mitigation |

---

## 7 — Data Flow

```
Founder Intent
    │
    ▼
Project (draft → scoped → active)
    │
    ▼
Task (draft → ready → assigned → in_progress)
    │
    ├─── ContextPack assembled
    │
    ▼
Run (created → preparing → running → produced_output → finalized)
    │
    ├─── Provider call via RoutingPolicy
    │
    ▼
Artifact (created → classified → submitted → under_review)
    │
    ▼
Review (created → in_progress → approved/rejected → closed)
    │
    ├─── If rejected: Task → rework_required → reassigned → new Run
    │
    ▼
Approval (pending → approved/rejected → closed)
    │
    ▼
Task → done → Project milestone
```

---

## 8 — Event Flow

All state transitions emit `ActivityEvent` records for audit trail.

**Layer 1 events:** `project.*`, `task.*`, `run.*`, `artifact.*`, `review.*`, `approval.*`
**Layer 2 events:** `employee.*`, `office.*`, `blog.*`, `hr.*`
**Layer 3 events:** `autonomy.*`, `experiment.*`

Events are append-only. No updates, no deletes.

---

## 9 — Founder Intervention Points

| Action | Layer | Automated? |
|--------|-------|------------|
| Project activation | Core | **No** — founder approval required |
| Architecture decisions | Core | **No** — founder approval required |
| Schema changes | Core | **No** — founder approval required |
| Release approval | Core | **No** — founder approval required |
| Task cancellation | Core | **No** — founder only |
| Review escalation resolution | Core | **No** — founder decision |
| HR hire/fire proposals | Company | **No** — founder approval required |
| Blog post publishing | Company | **No** — founder approval required |
| Model replacement | Company | **No** — proposal only, founder decides |
| Autonomy budget increase | Autonomy | **No** — founder controls budget |
| Prompt version deployment | Autonomy | **No** — founder approves |

---

## 10 — Deterministic vs Experimental

| Category | Deterministic | Experimental |
|----------|--------------|--------------|
| State machine transitions | ✅ | |
| Guard validation | ✅ | |
| Orchestration use cases | ✅ | |
| Provider routing | ✅ | |
| Activity event emission | ✅ | |
| Employee performance scoring | | ✅ |
| Bottleneck prediction | | ✅ |
| Model competition | | ✅ |
| Prompt A/B testing | | ✅ |
| Autonomy pipeline | | ✅ |
| Blog content generation | | ✅ |

---

## 11 — Single Source of Truth Index

| Concept | Authoritative Document |
|---------|----------------------|
| State definitions & transitions | `core/03-state-machine.md` |
| Guard rules | `core/05-guard-matrix.md` |
| Data model | `core/04-data-model.md` |
| All scoring formulas | `core/09-performance-scoring.md` |
| Feature flags | `08-feature-flags.md` |
| System mode | `07-system-mode.md` |
| Risk matrix | `29-risk-and-safety-matrix.md` |
| Token costs | `28-token-economy-and-budgeting.md` |
| Operating modes | `27-operating-modes.md` |

---

## 12 — Technology Stack

- **Frontend:** React + Vite + Tailwind + TypeScript (Lovable-generated)
- **Backend:** Next.js App Router (route handlers as API)
- **ORM:** Prisma
- **Database:** PostgreSQL (Supabase)
- **Validation:** Zod
- **Edge Functions:** Supabase Edge Functions (Deno)
- **Real-time:** Supabase Realtime (WebSocket)

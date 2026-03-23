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

## 3 — Layer 1 — Core Engine (Documents 01–08)

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
| 12 | Load Balancer | Task distribution across employees by capacity and performance |
| 13 | Hiring Market | Model marketplace, benchmarking, competitive scoring |
| 14 | Performance & Rating Engine | Quality scoring, rolling averages, run evaluations |
| 15 | Replacement Engine | Employee replacement proposals with founder approval |
| 16 | Company Blog Module | AI copywriter, event-driven drafts, founder approval |
| 17 | Real-Time Office | Pixel visualization, zone mapping, office events |
| 18 | Prediction & Bottleneck Engine | Proactive bottleneck detection, confidence scoring |

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

---

## 6 — Data Flow

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

## 7 — Event Flow

All state transitions emit `ActivityEvent` records for audit trail.

**Layer 1 events:** `project.*`, `task.*`, `run.*`, `artifact.*`, `review.*`, `approval.*`
**Layer 2 events:** `employee.*`, `office.*`, `blog.*`, `hr.*`
**Layer 3 events:** `autonomy.*`, `experiment.*`

Events are append-only. No updates, no deletes.

---

## 8 — Founder Intervention Points

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

## 9 — Deterministic vs Experimental

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

## 10 — Operating Modes

See document `27-operating-modes.md` for full details.

| Mode | Layer 1 | Layer 2 | Layer 3 | Description |
|------|---------|---------|---------|-------------|
| **Minimal Stable** | ✅ | ❌ | ❌ | Core workflow only. No company features. |
| **Lean Autonomous** | ✅ | Partial | ❌ | Core + basic team/employee. No experiments. |
| **Company** | ✅ | ✅ | ❌ | Full company simulation. No autonomy. |
| **Experimental** | ✅ | ✅ | ✅ | All features enabled. Highest token usage. |

---

## 11 — Key Invariants

1. Every task has exactly one current lifecycle state
2. Every run belongs to exactly one task
3. Every artifact has a source task or run
4. Every review ends in a closed state
5. A task in `done` cannot have unresolved blocking reviews
6. A project in `completed` cannot have active critical tasks
7. State changes go through OrchestrationService — never direct DB updates
8. Founder approval is required for all production-critical decisions
9. Provider failure never corrupts workflow state
10. Events are append-only audit records

---

## 12 — Technology Stack

- **Frontend:** React + Vite + Tailwind + TypeScript (Lovable-generated)
- **Backend:** Next.js App Router (route handlers as API)
- **ORM:** Prisma
- **Database:** PostgreSQL (Supabase)
- **Validation:** Zod
- **Edge Functions:** Supabase Edge Functions (Deno)
- **Real-time:** Supabase Realtime (WebSocket)

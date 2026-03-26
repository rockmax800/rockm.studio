---
layer: front-office
criticality: critical
enabled_in_production: yes
doc_kind: contract
load_strategy: auto
---

# Lead → CTO Deterministic Pipeline v1.0

> Unified architecture contract for the Company Lead → AI CTO planning-to-delivery pipeline.

## 1 — Purpose

Defines the single deterministic path from product idea to live Delivery tasks. Every project in the system follows this pipeline. There are no shortcuts, side-channels, or alternative creation surfaces.

---

## 2 — Pipeline Stages

```
Idea
  │
  ▼
Clarification Loop ──founder confirms──▶ Scope locked
  │
  ▼
System Decomposition ──produces──▶ modules_json + dependency_graph_json
  │
  ▼
MVP Reduction Pass ──founder confirms──▶ MVP boundary set
  │
  ▼
Enhanced Blueprint ──founder approves via Approval──▶ BlueprintContract (approved)
  │
  ▼
EstimateReport ──founder approves via Approval──▶ Budget confirmed
  │
  ▼
CTO Readiness Gate ──validates planning completeness──▶ Pass / Fail
  │
  ▼
Engineering Slices ──AI CTO normalizes──▶ Bounded implementation units
  │
  ▼
TaskSpec Drafts ──AI CTO compiles──▶ Atomic execution specifications
  │
  ▼
Execution Plan (DAG) ──AI CTO orders──▶ Batched, dependency-aware plan
  │
  ▼
LaunchDecision ──founder approves──▶ Project created
  │
  ▼
Materialization ──founder confirms──▶ Live Delivery Tasks
```

**Hard invariant:** No stage may be skipped. Each stage requires explicit completion before the next begins.

---

## 3 — Responsibility Matrix

| Stage | Owner | Authority |
|-------|-------|-----------|
| Idea → Clarification | Company Lead | Drives questions, resolves ambiguities |
| System Decomposition | Company Lead | Defines modules and dependencies |
| MVP Reduction | Company Lead + Founder | Lead proposes; founder confirms boundary |
| Enhanced Blueprint | Company Lead | Produces; founder approves via Approval |
| EstimateReport | Company Lead | Generates; founder approves via Approval |
| CTO Readiness Gate | AI CTO | Validates planning completeness (read-only) |
| Engineering Slices | AI CTO | Normalizes modules into implementation units |
| TaskSpec Drafts | AI CTO | Compiles slices into atomic specifications |
| Execution Plan | AI CTO | Orders tasks into dependency-aware batches |
| LaunchDecision | Founder | Final gate before project creation |
| Materialization | Founder | Converts drafts to live Delivery tasks |

**Founder is final authority at every gate.** No autonomous progression.

---

## 4 — Handoff Contract: Company Lead → AI CTO

### 4.1 — Required Input Artifacts

The AI CTO begins work only when all of the following exist:

| Artifact | Source | Validation |
|----------|--------|------------|
| `clarification_snapshots` | Clarification Loop | `completed = true` |
| `blueprint_modules` | System Decomposition | `count ≥ 1` |
| `blueprint_dependency_edges` | System Decomposition | Exist, or independence acknowledged |
| `blueprint_contracts.delivery_mode` | MVP Reduction | Set (`mvp_first` / `full_scope` / `phased_rollout`) |
| `blueprint_optimization_notes` | Company Lead session | May be empty |
| `cto_backlog_cards` | CTO Backlog Draft phase | `count ≥ 1` |
| `ai_task_drafts` | Atomic AI Task Draft phase | `count ≥ 1` |
| Approved Approval entity | Blueprint approval | `decision = approved`, `state ∈ {decided, closed}` |

### 4.2 — Validation (CTO Readiness Gate)

The AI CTO runs `src/lib/cto-readiness.ts` and `src/lib/planning-gates.ts` to verify all prerequisites. If any check fails, the CTO emits a structured error and does **not** proceed.

### 4.3 — Return Path

If the AI CTO detects planning insufficiency after the gate passes (e.g., contradictory module boundaries, undefined interfaces), it may:

1. Emit a **clarification request** back to Company Lead / founder.
2. Flag specific gaps in the CTO Overview panel.
3. Block downstream engineering work until gaps are resolved.

**The AI CTO may NOT:**
- Modify approved scope, modules, or MVP boundaries.
- Invent new top-level modules.
- Override Company Lead strategy decisions.
- Silently proceed with incomplete planning.

---

## 5 — Boundary Rules

### 5.1 — Company Lead Boundary

The Company Lead owns:
- Business strategy and product vision
- Module definitions and their responsibilities
- MVP scope decisions (which modules are in/out)
- Acceptance criteria at the business level
- Blueprint creation and optimization notes

The Company Lead does **not**:
- Define engineering layers or file paths
- Create TaskSpec drafts or execution plans
- Decide task parallelism or batch ordering

### 5.2 — AI CTO Boundary

The AI CTO owns:
- Engineering normalization (modules → slices → TaskSpecs)
- Layer classification (dto / entity / service / api / ui / test / migration)
- Path boundary assignment (allowed/forbidden repo areas)
- Execution DAG construction (batches, critical path, parallelism)
- Conformance validation (post-run boundary/DoD checks)
- Sanity checks (complexity, cross-module bleed, dependency order)

The AI CTO does **not**:
- Redefine business scope or add/remove modules
- Perform MVP reduction or prioritization
- Approve blueprints or estimates
- Create live Delivery Plane tasks (only drafts)
- Bypass the LaunchDecision gate
- Modify the state machine or transition logic

### 5.3 — Founder Authority

The founder:
- Approves at every gate (clarification, blueprint, estimate, launch, materialization)
- May override any AI CTO recommendation
- May reorder, skip, or modify execution plan batches
- Is the sole authority for LaunchDecision
- Must explicitly confirm materialization of drafts into live tasks

---

## 6 — Delivery Boundary

### 6.1 — Pre-Launch State

Before LaunchDecision / project creation, all AI CTO outputs carry `status = draft`. They exist in the **Intent Plane** and do not create Delivery Plane state.

Persisted draft tables:
- `engineering_slice_drafts`
- `taskspec_drafts`
- `execution_plan_drafts`
- `cto_conformance_reports`

### 6.2 — Materialization Gate

After LaunchDecision and project creation, the founder may trigger materialization via `src/lib/materialize-delivery-tasks.ts`. This converts TaskSpec drafts into live Delivery tasks.

Prerequisites for materialization:
1. Project entity exists (LaunchDecision passed)
2. CTO Readiness Gate passed
3. No `blocked` TaskSpec drafts in sanity check
4. Founder explicit confirmation

### 6.3 — Post-Materialization

Once materialized, live tasks enter the standard Delivery Plane lifecycle:
```
Task → Run → Artifact → Review → Approval
```

The AI CTO may perform post-run conformance checks but cannot modify task state. Conformance reports are advisory; the founder makes final decisions on violations.

---

## 7 — Dependency Rule Compliance

This pipeline operates across Intent and Delivery planes while respecting the hierarchy:

```
Intent → Delivery → Knowledge → Experience → Evolution
```

- Company Lead and AI CTO planning artifacts are Intent Plane.
- Live tasks after materialization are Delivery Plane.
- Knowledge Plane (scoring, learning) may inform planning but cannot block or trigger transitions.
- Experience Plane (UI) renders state but does not mutate it.
- Evolution Plane proposes changes but requires founder approval to enact.

---

## 8 — Clarification Request Protocol

When the AI CTO encounters planning gaps after the readiness gate:

| Trigger | Action | Visibility |
|---------|--------|------------|
| Contradictory module boundaries | Emit clarification request | CTO Overview panel + Founder inbox |
| Undefined interfaces between modules | Flag in engineering slice warnings | CTO Overview panel |
| Complexity exceeds threshold | Block downstream TaskSpec generation | Sanity Check panel |
| Missing dependency edges | Request dependency clarification | CTO Readiness Gate |

Clarification requests are informational. They do not modify approved scope. The Company Lead or founder must resolve them before the AI CTO can proceed.

---

## 9 — Related Documents

| Document | Relationship |
|----------|-------------|
| `company-lead-planning-package.md` | Defines phases 1–6 (Company Lead responsibility) |
| `ai-cto-engineering-package.md` | Defines AI CTO normalization and execution planning |
| `blueprint-contract.md` | Enhanced Blueprint entity with modular decomposition |
| `estimate-report.md` | Module-aware estimation with planning prerequisites |
| `launch-decision.md` | Final gate before project creation |
| `core/03-state-machine.md` | Lifecycle transitions governing the pipeline |
| `core/10-role-contracts-and-taskspec.md` | TaskSpec entity that AI CTO compiles into |

---

## 10 — Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Clarification Loop | ✅ Implemented | `clarification_snapshots` table, `CompanyLeadSession` |
| System Decomposition | ✅ Implemented | `blueprint_modules`, `blueprint_dependency_edges` |
| MVP Reduction | ✅ Implemented | `src/lib/mvp-reduction.ts` |
| Enhanced Blueprint | ✅ Implemented | `blueprint_contracts` with modules |
| Planning Gate | ✅ Implemented | `src/lib/planning-gates.ts` |
| CTO Readiness Gate | ✅ Implemented | `src/lib/cto-readiness.ts`, UI in `CtoReadinessGate.tsx` |
| Engineering Slices | ✅ Implemented | `src/lib/engineering-slices.ts`, `engineering_slice_drafts` table |
| TaskSpec Drafts | ✅ Implemented | `src/lib/taskspec-draft-compiler.ts`, `taskspec_drafts` table |
| Execution Plan (DAG) | ✅ Implemented | `src/lib/execution-planner.ts`, `execution_plan_drafts` table |
| Sanity Checks | ✅ Implemented | `src/lib/taskspec-sanity.ts` |
| Conformance Gate | 🟡 Structural only | `src/lib/cto-conformance.ts` — no live telemetry |
| Materialization | ✅ Implemented | `src/lib/materialize-delivery-tasks.ts` |
| CTO Overview (UI) | ✅ Implemented | `src/components/project-cockpit/CtoOverview.tsx` |
| Canonical Persistence | ✅ Implemented | 4 draft tables + `use-ai-cto-planning.ts` hook |

> **Document Honesty:** Conformance checks are structural only — derived from draft quality, not live run telemetry. This is labelled honestly in the UI.

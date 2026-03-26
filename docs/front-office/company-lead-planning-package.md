---
layer: front-office
criticality: critical
enabled_in_production: yes
doc_kind: contract
load_strategy: auto
---

# Company Lead Planning Package v2.1

> Front Office — Structured architectural planning before estimation and launch.

## 1 — Purpose

Upgrades the Front Office flow from simple consultation to a strict architectural planning package. Every project that enters the pipeline must pass through mandatory planning phases before it can reach estimation or launch. The founder remains final authority at every gate.

---

## 2 — Mandatory Phases

The planning package consists of six sequential phases. Each phase produces explicit, inspectable artifacts.

| # | Phase | Output | Gate |
|---|-------|--------|------|
| 1 | Clarification Loop | Resolved ambiguities, confirmed scope boundaries | Founder marks clarification complete |
| 2 | System Decomposition | `modules_json`, `dependency_graph_json` | At least one module defined with dependencies |
| 3 | MVP Reduction Pass | Prioritized module list, deferred items list | Founder confirms MVP boundary |
| 4 | Enhanced Blueprint | BlueprintContract with modules + acceptance criteria | Founder approval via Approval entity |
| 5 | CTO Backlog Draft | Ordered work items with role assignments (Intent artifact) | Founder review — remains draft until launch |
| 6 | Atomic AI Task Drafts | Fine-grained task specifications (Intent artifact) | Founder review — remains draft until launch |

---

## 3 — Phase Details

### 3.1 — Clarification Loop

Structured back-and-forth to resolve ambiguities in the IntakeRequest before any technical decomposition begins.

- **Input:** IntakeRequest in `draft` or `discussed` status
- **Output:** Clarification log with resolved questions, updated constraints, confirmed non-goals
- **Completion signal:** Founder explicitly marks clarification as complete
- **Artifact type:** Planning artifact (not persisted canonically until future prompt adds persistence)

### 3.2 — System Decomposition

Breaks the clarified scope into discrete modules with explicit dependency relationships.

- **Input:** Completed clarification, IntakeRequest data
- **Output:**
  - `modules_json` — array of module definitions (name, responsibility, complexity band)
  - `dependency_graph_json` — directed dependency graph between modules
- **Constraint:** No EstimateReport can be created without these two artifacts
- **Artifact type:** Planning artifact attached to BlueprintContract

### 3.3 — MVP Reduction Pass

Applies founder judgment to prioritize modules into MVP vs. deferred scope.

- **Input:** System decomposition output
- **Output:**
  - MVP module list (ordered by delivery priority)
  - Deferred modules list with rationale
  - Risk notes for MVP-only delivery
- **Completion signal:** Founder confirms MVP boundary
- **Artifact type:** Planning artifact

### 3.4 — Enhanced Blueprint

An upgraded BlueprintContract that includes modular decomposition data alongside the existing scope, acceptance criteria, and risk fields.

- **Input:** MVP-reduced module list, clarification log
- **Output:** BlueprintContract with enriched `scope_json` containing module references
- **Gate:** Founder approval via canonical Approval entity (`target_type = blueprint_contract`)
- **Hard invariant:** No blueprint creation without clarification complete

### 3.5 — CTO Backlog Draft

An ordered list of work items derived from the approved blueprint's module decomposition. Assigns anticipated roles and effort bands per item.

- **Input:** Approved Enhanced Blueprint
- **Output:** Ordered backlog items with role assignments and effort estimates
- **Lifecycle rule:** This is an **Intent Plane artifact**. It may exist before launch but does NOT create Delivery Plane tasks.
- **Artifact type:** Planning draft — labelled as `draft/planning`

### 3.6 — Atomic AI Task Drafts

Fine-grained task specifications ready for conversion to live Delivery tasks after project creation.

- **Input:** CTO Backlog Draft
- **Output:** Task specifications with acceptance criteria, input/output definitions, role assignments
- **Lifecycle rule:** These remain **Intent Plane artifacts** until the LaunchDecision gate is passed and a Project entity is created. Only then may they be converted to live Delivery tasks.
- **Artifact type:** Planning draft — labelled as `draft/planning`

---

## 4 — Hard Invariants

These rules are non-negotiable and enforce the planning package contract:

| # | Invariant | Rationale |
|---|-----------|-----------|
| 1 | No BlueprintContract without clarification complete | Prevents scoping on ambiguous requirements |
| 2 | No EstimateReport without `modules_json` + `dependency_graph_json` | Prevents estimation without architectural understanding |
| 3 | No Delivery task creation without CTO Backlog Draft | Prevents ad-hoc task creation bypassing planning |
| 4 | No live Delivery tasks before launch/project creation | Enforces the LaunchDecision gate — Intent ≠ Delivery |
| 5 | Founder is final approval authority at every gate | No autonomous progression through phases |
| 6 | CTO Backlog Draft and Atomic Task Drafts are Intent artifacts | They do not touch Delivery Plane state until post-launch |

---

## 5 — Lifecycle Integration

```
IntakeRequest (draft)
    │
    ▼
Clarification Loop ──founder marks complete──▶ IntakeRequest (discussed)
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
CTO Backlog Draft ──founder reviews──▶ Ordered work items (Intent artifact)
    │
    ▼
Atomic AI Task Drafts ──founder reviews──▶ Task specs (Intent artifact)
    │
    ▼
EstimateReport ──requires modules_json + dependency_graph_json──▶ Created
    │
    ▼
LaunchDecision ──founder approves──▶ Project created
    │
    ▼
Task Drafts ──converted to──▶ Live Delivery Tasks (Delivery Plane)
```

---

## 6 — Dependency Rule Compliance

This planning package operates entirely within the **Intent Plane**. It respects the dependency hierarchy:

```
Intent → Delivery → Knowledge → Experience
```

- Planning artifacts inform Delivery but do not create Delivery state.
- Delivery tasks are only created after the canonical launch gate.
- Knowledge Plane (market benchmarking, learning pipeline) may inform planning but cannot block or trigger planning transitions.

### 6.1 — Handoff to AI CTO

After the Company Lead completes all six phases, the planning package is handed off to the **AI CTO Engineering Package** (`docs/delivery/ai-cto-engineering-package.md`). The AI CTO:

- Validates planning completeness (all six phases passed)
- Normalizes CTO Backlog Drafts + AI Task Drafts into engineering slices
- Compiles engineering slices into canonical TaskSpec drafts
- Builds a dependency-aware execution plan (DAG)

**Boundary rule:** The Company Lead decides *what* to build. The AI CTO decides *how* to slice it for execution. The founder approves both. The AI CTO does not modify scope, add modules, or perform MVP reduction.

---

## 7 — Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Clarification Loop | ⬜ UI placeholder | Draft state in CompanyLeadSession |
| System Decomposition | ⬜ Not implemented | Requires modules_json schema |
| MVP Reduction Pass | ⬜ Not implemented | Requires decomposition first |
| Enhanced Blueprint | 🟡 Partial | BlueprintContract exists; module enrichment not yet added |
| CTO Backlog Draft | ⬜ Not implemented | Intent artifact — no schema yet |
| Atomic AI Task Drafts | ⬜ Not implemented | Intent artifact — no schema yet |
| Hard invariants (code) | ⬜ Not enforced in code | Documented as contract; code enforcement requires future prompt |

> **Document Honesty:** The above statuses reflect current branch reality. The contract is defined and canonical; code enforcement will follow in dedicated implementation prompts.

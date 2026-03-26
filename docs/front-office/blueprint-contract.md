---
layer: front-office
criticality: critical
enabled_in_production: yes
doc_kind: contract
load_strategy: auto
---

# Blueprint Contract

> Front Office — Structured scope agreement before estimation.

## 1 — Purpose

Transforms a discussed IntakeRequest into a structured scope contract with acceptance criteria, key decisions, and risk identification. Requires founder approval via the canonical Approval entity before estimation.

---

## 2 — Entity Fields

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| intake_request_id | uuid | FK — source request |
| scope_json | jsonb | What will be built |
| out_of_scope_json | jsonb | Explicit exclusions |
| acceptance_criteria_json | jsonb | How delivery is validated |
| key_decisions_json | jsonb | Architecture and design decisions |
| critical_risks_json | jsonb | Identified risks |
| effort_band | string | small / medium / large / xlarge |
| modules_json | jsonb | **v2.1** — Array of `SystemModule` definitions (see `src/types/front-office-planning.ts`) |
| dependency_graph_json | jsonb | **v2.1** — Array of `DependencyEdge` records between modules |
| delivery_mode | string | **v2.1** — `mvp_first` / `full_scope` / `phased_rollout` |
| optimization_notes_json | jsonb | **v2.1** — Array of `OptimizationNote` — founder + system observations |
| created_at | timestamp | |

---

## 3 — Approval Gate

Blueprint approval is managed through the canonical **Approval entity**:

- `target_type = blueprint_contract`
- `target_id = blueprint_contract.id`
- `approval_type = blueprint_approval`

An EstimateReport can only be created when an Approval record with `decision = approved` and `state ∈ {decided, closed}` exists for the blueprint.

**Governance invariant:** No boolean `approved_by_founder` flag. All approval decisions go through the Approval entity for auditability and lifecycle tracking.

> **Migration note (v1.2):** The `approved_by_founder` and `approved_at` boolean fields have been removed. Existing approved records were migrated to Approval entity records with `decision=approved, state=closed`.

---

## 4 — Rules

- One IntakeRequest can produce multiple BlueprintContract iterations.
- Only the blueprint with an approved Approval record proceeds to estimation.
- Scope changes after approval require a new blueprint version and new Approval.

---

## 5 — Planning Package Integration (v2.1)

Under the **Company Lead Planning Package v2.1**, the BlueprintContract becomes an **Enhanced Blueprint** that includes modular decomposition data:

- `scope_json` must reference module definitions from System Decomposition.
- The blueprint cannot be created without a completed Clarification Loop.
- After approval, the blueprint feeds into the CTO Backlog Draft phase.

**Hard invariants:**
- No blueprint without clarification complete.
- No EstimateReport without `modules_json` + `dependency_graph_json` attached to or derived from this blueprint.

See `company-lead-planning-package.md` for the full phase sequence and `lead-cto-deterministic-pipeline.md` for the unified Lead → CTO pipeline contract.

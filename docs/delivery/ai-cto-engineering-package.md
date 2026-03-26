---
layer: delivery
criticality: critical
enabled_in_production: no
doc_kind: contract
load_strategy: auto
---

# AI CTO Engineering Package

> Delivery — Engineering normalization layer between Company Lead planning and Delivery execution.

## 1 — Purpose

The AI CTO is a **non-autonomous engineering normalization layer**. It receives structured planning artifacts from the Company Lead Planning Package (Intent Plane) and transforms them into execution-ready engineering specifications for the Delivery Plane.

The AI CTO does **not** replace the Company Lead, the founder, or the Approval model. It is a deterministic compiler: planning artifacts in, engineering specifications out.

### 1.1 — Position in the Pipeline

```
Company Lead (Intent Plane)
    │
    │  Clarified intake, modules, dependencies,
    │  delivery_mode, optimization_notes,
    │  CTO backlog drafts, AI task drafts
    │
    ▼
AI CTO Engineering Package (Intent → Delivery bridge)
    │
    │  Engineering slices, TaskSpec drafts,
    │  execution plan (DAG), conformance reports
    │
    ▼
Delivery Plane (after launch/project creation gate)
    │
    │  Live tasks, runs, artifacts, reviews, CI/CD
    │
    ▼
Production
```

---

## 2 — What AI CTO Does

| # | Responsibility | Description |
|---|---------------|-------------|
| 1 | **Validate planning completeness** | Checks that all required Company Lead outputs exist and meet quality thresholds before engineering work begins. Uses the Planning Gate contract (`src/lib/planning-gates.ts`). |
| 2 | **Normalize planning into engineering slices** | Transforms CTO Backlog Card Drafts + AI Task Drafts into structured engineering slices with explicit boundaries, interfaces, and dependencies. |
| 3 | **Compile engineering slices into TaskSpec drafts** | Maps each engineering slice to the canonical TaskSpec entity (see `core/10-role-contracts-and-taskspec.md`), filling `goal`, `allowed_repo_paths_json`, `acceptance_criteria_json`, `verification_plan_json`, etc. |
| 4 | **Create execution DAG / batch plan** | Orders TaskSpec drafts into a dependency-aware execution plan: which tasks can run in parallel, which must be sequential, what the critical path is. |
| 5 | **Perform post-run conformance review** | After a run completes, validates that outputs match the TaskSpec and engineering slice boundaries. Flags violations for founder review. |

---

## 3 — What AI CTO Does NOT Do

| # | Constraint | Rationale |
|---|-----------|-----------|
| 1 | Does **not** redefine business scope | Business scope is owned by the Company Lead and approved by the founder. AI CTO receives scope, does not modify it. |
| 2 | Does **not** create new modules independently | Module decomposition is a Company Lead responsibility. AI CTO may suggest splits within existing modules but cannot add new top-level modules. |
| 3 | Does **not** perform MVP reduction | MVP scope decisions are founder-owned (Company Lead Planning Package Phase 3). AI CTO works with the post-reduction module set. |
| 4 | Does **not** bypass approvals | All gates use the canonical Approval entity. AI CTO cannot mark blueprints as approved or skip the launch gate. |
| 5 | Does **not** create live Delivery tasks before launch/project creation | All AI CTO outputs remain drafts in the Intent Plane until the founder completes the launch gate. |
| 6 | Does **not** modify the state machine | Lifecycle transitions remain under OrchestrationService control. AI CTO reads state but does not write transitions. |

---

## 4 — Inputs (from Company Lead Planning Package)

The AI CTO consumes the following artifacts, all produced during the Company Lead session:

| Input | Source Entity | Notes |
|-------|--------------|-------|
| Clarified intake | `clarification_snapshots` | Must be `completed = true` |
| Module definitions | `blueprint_modules` | From System Decomposition phase |
| Dependency graph | `blueprint_dependency_edges` | Module-to-module relationships |
| Delivery mode | `blueprint_contracts.delivery_mode` | `mvp_first` / `full_scope` / `phased_rollout` |
| Optimization notes | `blueprint_optimization_notes` | Founder + system observations |
| CTO Backlog Drafts | `cto_backlog_cards` | Work items with role assignments |
| AI Task Drafts | `ai_task_drafts` | Fine-grained task specifications |

### 4.1 — Prerequisite Check

Before the AI CTO begins engineering normalization, it validates:

```
✓ clarification_snapshots.completed = true
✓ blueprint_modules.count ≥ 1
✓ blueprint_dependency_edges exist (or independence acknowledged)
✓ MVP reduction complete (if delivery_mode = mvp_first)
✓ BlueprintContract has approved Approval entity
✓ cto_backlog_cards.count ≥ 1
```

If any check fails, the AI CTO emits a structured error and does **not** proceed.

---

## 5 — Outputs

### 5.1 — Engineering Slice Drafts

An engineering slice is a bounded, implementable unit derived from one or more AI Task Drafts.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| source_task_draft_ids | uuid[] | Which AI Task Drafts this slice covers |
| source_backlog_card_id | uuid | Parent CTO Backlog Card |
| module_name | text | Which module this slice belongs to |
| layer_type | text | dto / entity / service / api / ui / test / migration / integration |
| goal | text | What this slice must achieve |
| interface_contract | jsonb | Input/output types, API contract |
| allowed_paths | text[] | File paths this slice may modify |
| forbidden_paths | text[] | File paths this slice must not modify |
| dependencies | uuid[] | Other slice IDs that must complete first |
| estimated_tokens | integer | Token budget for this slice |
| risk_class | text | low / medium / high |
| status | text | `draft` until launch gate |

### 5.2 — TaskSpec Drafts

Each engineering slice compiles into a canonical TaskSpec draft. The TaskSpec entity is defined in `core/10-role-contracts-and-taskspec.md`. The AI CTO populates:

- `goal` — from engineering slice goal
- `allowed_repo_paths_json` — from engineering slice allowed_paths
- `forbidden_repo_paths_json` — from engineering slice forbidden_paths
- `acceptance_criteria_json` — from CTO Backlog Card definition_of_done + engineering slice interface_contract
- `verification_plan_json` — test requirements from backlog card + layer-specific checks
- `risk_class` — from engineering slice risk assessment
- `required_artifacts_json` — layer-appropriate artifact categories (implementation, test, review)
- `definition_of_done_json` — from backlog card + engineering slice boundaries

**Hard invariant:** No TaskSpec draft without a source engineering slice. TaskSpecs are not invented independently.

### 5.3 — Execution Plan (DAG)

The execution plan is a dependency-aware ordering of TaskSpec drafts:

```
{
  "batches": [
    { "batch": 1, "taskspec_ids": ["migration-1", "dto-1"], "parallel": true },
    { "batch": 2, "taskspec_ids": ["entity-1", "entity-2"], "parallel": true },
    { "batch": 3, "taskspec_ids": ["service-1"], "parallel": false },
    { "batch": 4, "taskspec_ids": ["api-1", "ui-1"], "parallel": true },
    { "batch": 5, "taskspec_ids": ["test-1", "integration-1"], "parallel": true }
  ],
  "critical_path": ["migration-1", "entity-1", "service-1", "api-1", "test-1"],
  "estimated_total_tokens": 285000,
  "estimated_total_days": 12.5
}
```

The execution plan respects:
- Layer ordering: migration → dto → entity → service → api → ui → test → integration
- Module dependencies from `blueprint_dependency_edges`
- Parallelism constraints from Role Contract `max_parallel_tasks`

### 5.4 — Conformance Reports

After a run completes, the AI CTO produces a conformance report:

| Field | Type | Notes |
|-------|------|-------|
| run_id | uuid | Which run was reviewed |
| taskspec_id | uuid | Which TaskSpec this run was for |
| path_violations | jsonb | Files modified outside allowed paths |
| missing_artifacts | text[] | Required artifacts not produced |
| acceptance_gaps | jsonb | Acceptance criteria not met |
| interface_violations | jsonb | Interface contract deviations |
| verdict | text | `conformant` / `minor_deviation` / `non_conformant` |
| founder_attention_required | boolean | Whether founder must review |

---

## 6 — Hard Invariants

These invariants are non-negotiable and must be enforced in code:

| # | Invariant | Enforcement |
|---|-----------|-------------|
| 1 | No delivery planning without approved blueprint | AI CTO checks Approval entity state before starting |
| 2 | No TaskSpec draft without engineering slice | TaskSpec compilation requires a source engineering slice ID |
| 3 | No live Delivery task without launch/project creation | All outputs carry `status = draft` until launch gate passes |
| 4 | CTO validates, but founder arbitrates | Conformance reports are advisory; founder makes final decision on violations |
| 5 | No module invention | AI CTO may only reference modules from `blueprint_modules` |
| 6 | No scope expansion | Engineering slices must trace back to approved CTO Backlog Cards |
| 7 | Execution plan is a suggestion | Founder may reorder, skip, or override any batch |

---

## 7 — Relationship to Existing Systems

### 7.1 — TaskSpec / Role Contract

The AI CTO is the **primary producer** of TaskSpec drafts. It compiles engineering slices into the canonical TaskSpec format defined in `core/10-role-contracts-and-taskspec.md`.

- Engineering slice `allowed_paths` → TaskSpec `allowed_repo_paths_json`
- Engineering slice `forbidden_paths` → TaskSpec `forbidden_repo_paths_json`
- Engineering slice `layer_type` → determines which Role Contract applies to the assigned agent

The AI CTO does **not** define Role Contracts. It selects the appropriate existing Role Contract for each TaskSpec based on layer type.

### 7.2 — Company Lead Planning Package

The AI CTO is the **downstream consumer** of the Company Lead Planning Package (`docs/front-office/company-lead-planning-package.md`).

```
Company Lead (strategy, scope, MVP decisions)
    ↓
AI CTO (engineering normalization, TaskSpec compilation)
    ↓
Delivery Spine (execution, CI/CD, deployment)
```

The boundary is clear: Company Lead decides **what** to build. AI CTO decides **how** to slice it for execution. Founder approves both.

### 7.3 — Delivery Spine

The AI CTO feeds into the Delivery Spine (`docs/delivery/delivery-lane.md`) but does not operate within it. Once TaskSpec drafts become live tasks after the launch gate, the Delivery Spine owns execution.

### 7.4 — Hard Enforcement Layer

Post-run conformance reports from the AI CTO feed into the Hard Enforcement Layer (`docs/delivery/41-hard-enforcement-layer.md`) as additional validation signals. Path violations detected by the AI CTO are surfaced alongside the enforcement layer's own checks.

---

## 8 — Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Planning Gate validation | ✅ Implemented | `src/lib/planning-gates.ts`, `src/lib/cto-readiness.ts` |
| Module-aware estimation | ✅ Implemented | `src/lib/module-estimation.ts` |
| CTO Backlog Draft generation | ✅ Implemented | `src/lib/cto-backlog.ts` |
| AI Task Draft decomposition | ✅ Implemented | `src/lib/ai-task-decomposition.ts` |
| Engineering Slice compilation | ✅ Implemented | `src/lib/engineering-slices.ts`, split/merge controls |
| TaskSpec draft generation | ✅ Implemented | `src/lib/taskspec-draft-compiler.ts`, auto-split at C>8 |
| Execution DAG computation | ✅ Implemented | `src/lib/execution-planner.ts`, cycle/parallel/critical-path |
| TaskSpec sanity validation | ✅ Implemented | `src/lib/taskspec-sanity.ts`, layer/DoD/path/complexity/bleed checks |
| Post-run conformance review | 🟡 Structural only | `src/lib/cto-conformance.ts` — no live telemetry on current branch |
| Canonical persistence | ✅ Implemented | 4 tables: `engineering_slice_drafts`, `taskspec_drafts`, `execution_plan_drafts`, `cto_conformance_reports` |
| Controlled materialization | ✅ Implemented | `src/lib/materialize-delivery-tasks.ts` — gated, founder-confirmed |
| CTO Overview (founder UI) | ✅ Implemented | `src/components/project-cockpit/CtoOverview.tsx` |
| CTO Readiness Gate (UI) | ✅ Implemented | `src/components/project-cockpit/CtoReadinessGate.tsx` |

> **Document Honesty:** Conformance checks are structural only — derived from draft quality, not live run telemetry. UI panels display "no telemetry" badges and honesty banners where applicable. All CTO outputs remain Intent Plane drafts until founder-confirmed materialization.

---
layer: core
criticality: critical
enabled_in_production: yes
doc_kind: contract
load_strategy: auto
---

# Artifact Type System

> Core Engine — Typed evidence model for delivery traceability.

## 1 — Purpose

Transforms Artifact from a generic container into a typed evidence model. Each artifact has a **category** that defines its contract: what references it must carry, what entity it originates from, and what delivery spine entities it connects to.

This ensures every artifact is traceable, classifiable, and auditable across the full delivery pipeline.

---

## 2 — Why Artifact Typing Matters

Without typing:
- Artifacts are opaque blobs — no way to distinguish a spec from a deployment receipt.
- Traceability breaks — "which artifact proves CI passed?" is unanswerable.
- Review is uninformed — reviewers don't know what evidence to expect.

With typing:
- Each category has a **contract**: required references, expected source entity.
- Delivery spine is fully traceable: Run → implementation_patch → review_report → qa_evidence → deployment_receipt.
- Consistency is enforceable at creation time.

---

## 3 — Artifact Categories

| Category | Description | Source Entity |
|----------|-------------|--------------|
| `spec` | Specification document | blueprint |
| `architecture` | Architecture decision or diagram | blueprint |
| `implementation_patch` | Code output from a Run | run |
| `review_report` | Review feedback and verdict | review |
| `qa_evidence` | Test results, CI reports | check_suite / deployment |
| `release_note` | User-facing release documentation | deployment |
| `deployment_receipt` | Deployment confirmation log | deployment |
| `blueprint` | Scoped project blueprint | blueprint |
| `estimate` | Cost/timeline estimate | estimate |
| `technical_plan` | Technical planning document | (none required) |

---

## 4 — Category Contracts

### 4.1 — `implementation_patch`

| Requirement | Field |
|-------------|-------|
| Must reference a Run | `run_id` required |
| Must reference a workspace | `related_repo_workspace_id` required |
| Source entity type | `run` |

### 4.2 — `review_report`

| Requirement | Field |
|-------------|-------|
| Must reference resolved review | `source_entity_id` → review with verdict |
| Source entity type | `review` |

### 4.3 — `qa_evidence`

| Requirement | Field |
|-------------|-------|
| Must reference CI or deployment | `related_check_suite_id` or `related_deployment_id` |
| Source entity type | `check_suite` or `deployment` |

### 4.4 — `release_note`

| Requirement | Field |
|-------------|-------|
| Must reference deployment | `related_deployment_id` required |
| Source entity type | `deployment` |

### 4.5 — `deployment_receipt`

| Requirement | Field |
|-------------|-------|
| Must reference live deployment | `related_deployment_id` required, deployment.status = `live` |
| Source entity type | `deployment` |

### 4.6 — `spec`, `architecture`, `blueprint`

| Requirement | Field |
|-------------|-------|
| Source entity type | `blueprint` |

### 4.7 — `estimate`

| Requirement | Field |
|-------------|-------|
| Source entity type | `estimate` |

### 4.8 — `technical_plan`

No mandatory references. Flexible planning artifact.

---

## 5 — Evidence Fields

Added to the `artifacts` table for delivery spine cross-referencing:

| Field | Type | Notes |
|-------|------|-------|
| artifact_category | text | One of the 10 defined categories |
| source_entity_type | text | run, review, deployment, blueprint, estimate, check_suite |
| source_entity_id | uuid | FK to the originating entity |
| related_repo_workspace_id | uuid | FK repo_workspaces |
| related_pull_request_id | uuid | FK pull_requests |
| related_check_suite_id | uuid | FK check_suites |
| related_deployment_id | uuid | FK deployments |
| changed_files_json | jsonb | Files modified (for implementation_patch) |
| tests_executed_json | jsonb | Test results (for qa_evidence) |

---

## 6 — Delivery Traceability Chain

```
Blueprint → spec artifact
  → Task → Run → implementation_patch artifact
    → Review → review_report artifact
      → CheckSuite → qa_evidence artifact
        → Deployment → deployment_receipt artifact
          → release_note artifact
```

Every step in the delivery pipeline produces a typed artifact that references the previous step. This creates a complete, auditable evidence chain from specification to production.

---

## 7 — Enforcement Rules

### 7.1 — Creation Enforcement

New artifacts SHOULD have `artifact_category` set. The `ArtifactConsistencyService.enforceCreation()` validates category presence and validity.

### 7.2 — Contract Validation

`ArtifactConsistencyService.validateCategoryContract()` checks all required references per category. Violations are logged but do not block creation (soft enforcement) to preserve backward compatibility.

### 7.3 — Hard Merge Enforcement (v1.2)

`HardEnforcementService.enforceArtifactCompleteness()` enforces artifact presence as a **hard gate** before PR merge:

- `implementation_patch` required for all tasks
- `review_report` required for all tasks
- `qa_evidence` required for high/critical risk_class
- `tests_executed_json` must not be empty

Violations block merge with classification `evidence_missing`. See `delivery/41-hard-enforcement-layer.md`.

### 7.4 — Specific Validations

| Category | Validation |
|----------|-----------|
| `implementation_patch` | `repo_workspace` must exist for the run |
| `review_report` | Review must have a `verdict` set |
| `deployment_receipt` | Deployment must have `status = live` |

---

## 8 — Backward Compatibility

- `artifact_category` is nullable — existing artifacts without categories continue to work.
- `artifact_type` enum is preserved — category is an additive classification layer.
- All new fields are nullable — no migration breaks.
- `ArtifactConsistencyService` provides audit tools to backfill categories on existing artifacts.

---

## 9 — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `core/04-data-model.md` | Artifact entity extended with evidence fields |
| `core/06-orchestration-use-cases.md` | UC-04/UC-05 set category on artifact creation |
| `delivery/delivery-lane.md` | Delivery spine entities are cross-referenced |
| `core/10-role-contracts-and-taskspec.md` | Required artifacts per role/task |

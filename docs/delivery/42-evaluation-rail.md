---
doc_kind: contract
load_strategy: auto
layer: knowledge
criticality: critical
enabled_in_production: yes
---

# 42 — Evaluation Rail

> Knowledge Plane — Independent verification layer parallel to Delivery Plane.
>
> **Always active.** Evaluation must never mutate delivery state.

## 1 — Purpose

Provides deterministic, reproducible verification of system quality independent of the Delivery Plane. Evaluation runs reference frozen context snapshots, never create PRs, never deploy, and never modify tasks or artifacts.

The Evaluation Rail answers: "Does this change meet our quality bar?" without affecting production.

---

## 2 — Architecture Position

```
┌─────────────────────────────────────────────────────────┐
│                    DELIVERY PLANE                        │
│  Tasks → Runs → Artifacts → Reviews → Deployments       │
│  (deterministic execution spine)                         │
├─────────────────────────────────────────────────────────┤
│                   EVALUATION RAIL                        │  ← NEW
│  Suites → Scenarios → EvalRuns → Reports → Baselines    │
│  (parallel verification — read-only on delivery state)   │
├─────────────────────────────────────────────────────────┤
│                   KNOWLEDGE PLANE                        │
│  Learning Proposals → Shadow Testing → Promotion         │
│  (proposes only — requires eval gate + founder approval) │
└─────────────────────────────────────────────────────────┘
```

**Dependency rule:** Evaluation Rail reads from Delivery Plane but never writes to it. Knowledge Plane promotions require Evaluation Rail gate to pass.

---

## 3 — Entities

### 3.1 — evaluation_suites

Defines a collection of test scenarios for a specific verification purpose.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | Suite name |
| description | text | What this suite verifies |
| suite_type | text | `architecture`, `implementation`, `qa`, `release`, `learning` |
| protected | boolean | If true, all critical scenarios must pass before promotion |
| created_at | timestamp | |

### 3.2 — evaluation_scenarios

Individual test cases within a suite.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| suite_id | uuid | FK → evaluation_suites |
| scenario_name | text | Unique within suite |
| scenario_description | text | What this scenario tests |
| input_fixture_ref | text | Reference to test input data |
| expected_outcome_json | jsonb | Expected result for comparison |
| critical | boolean | Must pass in protected suites |
| created_at | timestamp | |

### 3.3 — evaluation_runs (extended)

Execution of a suite against a context snapshot.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| suite_id | uuid | FK → evaluation_suites |
| related_run_id | uuid | Optional — delivery run being evaluated |
| learning_proposal_id | uuid | Optional — learning proposal being evaluated |
| context_snapshot_ref | uuid | **Required** — frozen context snapshot |
| result_metrics_json | jsonb | Detailed results |
| pass_rate | float | Overall pass rate |
| failed_scenarios_json | jsonb | Names of failed scenarios |
| status | text | `created`, `running`, `completed`, `failed` |
| created_at | timestamp | |

### 3.4 — evaluation_reports

Aggregated evaluation result for a target entity.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| target_type | text | `run`, `learning_proposal`, `deployment` |
| target_id | uuid | ID of the target entity |
| summary_json | jsonb | Aggregated metrics |
| baseline_comparison_json | jsonb | Delta from baseline |
| protected_scenarios_passed | boolean | All critical scenarios passed |
| created_at | timestamp | |

**Approval:** Report approval goes through the `Approval` entity. No boolean `approved_by_founder` field.

### 3.5 — evaluation_baselines

Baseline metrics per suite for trend comparison.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| suite_id | uuid | FK → evaluation_suites (unique) |
| baseline_metrics_json | jsonb | Current baseline |
| last_updated | timestamp | |

---

## 4 — Evaluation Lifecycle

```
Suite created (with scenarios)
  │
  ▼
EvalRun created (references frozen context_snapshot)
  │
  ▼
Scenarios executed (deterministic, reproducible)
  │
  ▼
EvalRun completed (pass_rate, failed_scenarios recorded)
  │
  ▼
Report generated (aggregated, compared to baseline)
  │
  ├─ Protected scenarios failed → BLOCK promotion/release
  │
  ▼ Protected scenarios passed
Founder reviews report
  │
  ▼
Approval entity created → promotion/release allowed
```

---

## 5 — Gate Rules

### Rule 1: Protected Suite Gate

If `evaluation_suite.protected === true`:
- ALL scenarios marked `critical === true` MUST pass
- Any critical failure blocks promotion and release

### Rule 2: Learning Promotion Gate

LearningProposal cannot be promoted unless:
1. `evaluation_report` exists for the proposal
2. `protected_scenarios_passed === true`
3. Founder `Approval` entity with `decision === "approved"`

### Rule 3: Release Gate

Production release requires:
1. `evaluation_report` exists for the deployment
2. `protected_scenarios_passed === true`

---

## 6 — Safety Invariants

| Rule | Enforcement |
|------|-------------|
| Evaluation MUST NOT create pull requests | Service boundary — no PR API calls |
| Evaluation MUST NOT deploy | Service boundary — no deploy API calls |
| Evaluation MUST NOT mutate tasks | Service boundary — no task state changes |
| Evaluation MUST NOT modify artifacts | Service boundary — read-only access |
| Evaluation MUST NOT auto-approve | Approval entity required |
| Evaluation MUST reference frozen snapshot | `context_snapshot_ref` required |
| Evaluation runs are deterministic | Same snapshot + scenarios = same results |

---

## 7 — Baseline Tracking

Baselines provide trend comparison:

```
New eval run completed
  │
  ▼
Compare to evaluation_baseline for suite
  │
  ├─ Improvement detected → record in report
  ├─ Regression detected → flag in report
  └─ No change → record neutral
  │
  ▼
Optionally update baseline (manual trigger)
```

---

## 8 — Event Log Integration

| Event | Trigger |
|-------|---------|
| `evaluation_run.created` | New eval run started |
| `evaluation_run.completed` | Eval run finished |
| `evaluation_report.created` | Report generated |

---

## 9 — Interaction with Learning Pipeline

```
LEARNING PIPELINE                 EVALUATION RAIL
     │                                  │
     │ creates proposal ──────────→     │
     │                                  │ runs evaluation suite
     │                                  │ generates report
     │                                  │
     │  ←── gate result ────────────    │
     │                                  │
     │ (if passed + founder approval)   │
     │ promotes version                 │
```

The Learning Pipeline CANNOT promote without Evaluation Rail gate passing. This prevents untested changes from reaching production.

---

## 10 — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `autonomy/27-learning-pipeline.md` | Promotions require eval gate |
| `delivery/41-hard-enforcement-layer.md` | Deploy gate checks eval report |
| `core/13-operational-planes.md` | Eval Rail lives in Knowledge Plane |
| `delivery/context-reproducibility.md` | Eval runs use frozen snapshots |
| `core/12-event-log-architecture.md` | All eval events logged |

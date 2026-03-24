---
layer: front-office
criticality: critical
enabled_in_production: yes
doc_kind: contract
load_strategy: auto
---

# Estimate Report

> Front Office — Cost and timeline estimation from approved blueprint.

## 1 — Purpose

Generates token, cost, and timeline estimates from an approved BlueprintContract. Provides min/avg/worst-case projections for founder decision-making.

---

## 2 — Entity Fields

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| blueprint_contract_id | uuid | FK |
| min_token_estimate | integer | Best case |
| avg_token_estimate | integer | Expected case |
| worst_case_token_estimate | integer | Worst case |
| min_cost_estimate | numeric | Best case cost |
| avg_cost_estimate | numeric | Expected cost |
| worst_case_cost_estimate | numeric | Worst case cost |
| timeline_days_estimate | integer | Calendar days |
| risk_notes_json | jsonb | Estimation risks |
| created_at | timestamp | |

---

## 3 — Approval Gate

Estimate approval is managed through the canonical **Approval entity**:

- `target_type = estimate_report`
- `target_id = estimate_report.id`
- `approval_type = estimate_approval`

A LaunchDecision can only be created when an Approval record with `decision = approved` and `state ∈ {decided, closed}` exists for the estimate.

**Governance invariant:** No boolean `approved_by_founder` flag. All approval decisions go through the Approval entity.

> **Migration note (v1.2):** The `approved_by_founder` and `approved_at` boolean fields have been removed. Existing approved records were migrated to Approval entity records.

---

## 4 — Rules

- Requires an approved BlueprintContract (via Approval entity).
- Founder must approve estimate (via Approval entity) before a LaunchDecision can be made.
- Estimates are informational — actual costs may vary.

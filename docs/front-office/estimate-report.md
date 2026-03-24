---
layer: front-office
criticality: critical
enabled_in_production: yes
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
| approved_by_founder | boolean | Default false |
| approved_at | timestamp | Nullable |
| created_at | timestamp | |

---

## 3 — Rules

- Requires an approved BlueprintContract.
- Founder must approve before a LaunchDecision can be made.
- Estimates are informational — actual costs may vary.

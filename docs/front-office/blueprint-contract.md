---
layer: front-office
criticality: critical
enabled_in_production: yes
---

# Blueprint Contract

> Front Office — Structured scope agreement before estimation.

## 1 — Purpose

Transforms a discussed IntakeRequest into a structured scope contract with acceptance criteria, key decisions, and risk identification. Requires founder approval before estimation.

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
| approved_by_founder | boolean | Default false |
| approved_at | timestamp | Nullable |
| created_at | timestamp | |

---

## 3 — Approval Gate

Blueprint must be approved by founder before an EstimateReport can be generated. This prevents premature cost estimation on unclear scope.

---

## 4 — Rules

- One IntakeRequest can produce multiple BlueprintContract iterations.
- Only the approved version proceeds to estimation.
- Scope changes after approval require a new blueprint version.

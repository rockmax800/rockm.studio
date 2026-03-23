---
layer: company
criticality: optional
enabled_in_production: no
---

# 18 — Prediction & Bottleneck Engine

> Layer 2 — Company Layer
>
> **Disabled in Production Mode.** Skipped via `isProduction()` check in `BottleneckPredictionService`.

## 1 — Purpose

Proactive detection of workflow bottlenecks before they cause delays.

---

## 2 — Prediction Types

| Type | Trigger |
|------|---------|
| role_overload | Role has more active tasks than max_parallel_tasks |
| slow_review | Review open longer than threshold |
| retry_cascade | Task has 3+ failed runs |
| blocked_chain | Multiple tasks blocked on same dependency |

---

## 3 — Bottleneck Predictions

| Field | Type | Notes |
|-------|------|-------|
| task_id | uuid | FK |
| role_id | uuid | FK (optional) |
| prediction_type | string | |
| confidence_score | numeric | 0–1 |
| explanation | string | |
| resolved | boolean | |

---

## 4 — Resolution

- Predictions are informational — no auto-action
- Displayed in Founder Dashboard
- Founder can act on predictions manually
- Mark as resolved when situation changes

---

## 5 — Token Cost

- Prediction engine runs periodically via edge function
- Uses `run-predictions` edge function
- Low token cost — primarily DB aggregation queries
- See `28-token-economy-and-budgeting.md` for cost analysis

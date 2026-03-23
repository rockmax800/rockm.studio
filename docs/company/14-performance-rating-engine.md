# 14 — Performance & Rating Engine

> Layer 2 — Company Layer

## 1 — Purpose

Unified scoring system for agent role and employee performance tracking.

---

## 2 — Run Evaluations

After each review resolution, `AgentPerformanceService` records:

| Field | Purpose |
|-------|---------|
| quality_score | Adjusted score (0–1) with risk penalty |
| cost_score | Estimated USD cost from usage log |
| latency_ms | Run duration |
| review_outcome | Review verdict |
| validation_risk_level | Risk classification |

---

## 3 — Quality Score Adjustment

```
adjusted_quality = base_quality_score
if validation_risk_level == "high": adjusted_quality -= 0.3
adjusted_quality -= min(cost_score, 1.0) × 0.1
adjusted_quality = clamp(0, 1)
```

---

## 4 — Rolling Performance

- Based on last 20 evaluations per role
- `performance_score` = average quality_score of recent evals
- `success_rate` = count(quality_score ≥ 0.7) / total recent evals

---

## 5 — Consolidation Note

This is the **single scoring system** for the platform.
`ModelCompetitionService` scoring (hiring market) uses different weights for model comparison only.
Employee/role performance always uses `AgentPerformanceService`.

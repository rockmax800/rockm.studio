---
layer: company
criticality: optional
enabled_in_production: no
---

# 14 — Performance & Rating Engine

> Layer 2 — Company Layer
>
> **Disabled in Production Mode.** Active only in Lean Autonomous, Company, or Experimental modes.

## 1 — Purpose

Tracks agent role and employee performance using the unified scoring system.

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

See `core/09-performance-scoring.md` §5 for the authoritative formula.

---

## 4 — Rolling Performance

- Based on last 20 evaluations per role
- `performance_score` = average quality_score of recent evals
- `success_rate` = count(quality_score ≥ 0.7) / total recent evals

---

## 5 — Reputation Score

See `core/09-performance-scoring.md` §6 for the authoritative formula.

> **No scoring formula is defined here.** All scoring uses `ScoringService.computePerformanceScore()`.

---

## 6 — Consolidation Note

This is the **single scoring system** for employee/role performance.
`ModelCompetitionService` scoring (hiring market) uses `computeCompetitionScore()` for model comparison only.
Both formulas are defined in `core/09-performance-scoring.md`.

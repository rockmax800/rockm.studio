---
layer: core
criticality: critical
enabled_in_production: yes
---

# 09 — Performance Scoring

> Layer 1 — Core Engine

## 1 — Purpose

**Single source of truth** for all performance scoring formulas in the system.
No other document may define scoring formulas. All modules reference this document.

---

## 2 — Unified Performance Score

Used by: `AgentPerformanceService`, `EmployeePerformanceService`, `LoadBalancerService`, `ScoringService.ts`

```
performance_score = (
  success_rate × 0.40 +
  cost_efficiency × 0.15 +
  latency_efficiency × 0.10 +
  (1 − bug_rate) × 0.20 +
  (1 − escalation_rate) × 0.15
)

where:
  cost_efficiency = 1 / (1 + avg_cost_usd)
  latency_efficiency = 1 / (1 + avg_latency_ms / 1000)
```

**Range:** 0–1. Higher is better.

**Implementation:** `src/services/ScoringService.ts → computePerformanceScore()`

---

## 3 — Competition Score (Model Market)

Used by: `ModelCompetitionService`, `HiringMarketDashboard`

```
competition_score = (
  avg_success_rate × 0.35 +
  cost_efficiency × 0.15 +
  latency_efficiency × 0.10 +
  reliability_score × 0.20 +
  avg_quality_score × 0.20
)
```

**Purpose:** Ranks models in hiring market for comparison. NOT used for employee evaluation.

**Implementation:** `src/services/ScoringService.ts → computeCompetitionScore()`

---

## 4 — Load Score (Task Distribution)

Used by: `LoadBalancerService`

```
load_score = load_factor × 0.40 + performance_score × 0.60

where:
  load_factor = 1 / (1 + active_tasks_count)
  performance_score = computePerformanceScore() from §2
```

**Purpose:** Task assignment weighting. Combines availability with performance.

---

## 5 — Quality Score (Run Evaluation)

Used by: `AgentPerformanceService`, `run_evaluations` table

```
adjusted_quality = base_quality_score
if validation_risk_level == "high": adjusted_quality -= 0.3
adjusted_quality -= min(cost_score, 1.0) × 0.1
adjusted_quality = clamp(0, 1)
```

**Purpose:** Per-run quality assessment after review resolution.

---

## 6 — Reputation Score (Employee)

```
reputation_score = computePerformanceScore({
  success_rate,
  avg_cost,
  avg_latency,
  bug_rate,
  escalation_rate
})
```

**Purpose:** Rolling employee performance. Uses same unified formula as §2.
Based on last 20 evaluations.

---

## 7 — Terminology

| Term | Definition | Range | Owner |
|------|-----------|-------|-------|
| `success_rate` | Fraction of runs with quality_score ≥ 0.7 | 0–1 | AgentPerformanceService |
| `reputation_score` | Employee rolling performance | 0–1 | EmployeePerformanceService |
| `competition_score` | Model market ranking | 0–1 | ModelCompetitionService |
| `load_score` | Task assignment weight | 0–1 | LoadBalancerService |
| `quality_score` | Per-run evaluation | 0–1 | AgentPerformanceService |
| `performance_score` | Agent role performance | 0–1 | ScoringService |

---

## 8 — Rules

1. All scoring MUST use `ScoringService.ts` — no inline formulas in services
2. Weight changes require updating this document AND `ScoringService.ts`
3. New scoring dimensions require approval before implementation
4. Scores are always 0–1 range, clamped

---
layer: business
criticality: informational
enabled_in_production: no
---

# Revenue Tracking

> Business Layer — Financial tracking and reporting.

## 1 — Purpose

Defines how revenue and costs are tracked across projects.

---

## 2 — Tracked Metrics

| Metric | Source | Granularity |
|--------|--------|-------------|
| Token cost per run | Run.estimated_cost | Per run |
| Token cost per task | Sum of run costs | Per task |
| Token cost per project | Sum of task costs | Per project |
| Estimated revenue | Effort band pricing | Per project |
| Margin | Revenue − total cost | Per project |

---

## 3 — Reporting

_Future implementation. Current state: cost data is captured per-run in the Run entity._

Planned reports:
- Monthly cost summary
- Per-project profitability
- Provider cost comparison
- Budget utilization rate

---

## 4 — Budget Hierarchy

See `token-economy-and-budgeting.md` for the detailed budget structure:
- System-level daily ceiling
- Project-level budget
- Task-level budget
- Run-level cost cap

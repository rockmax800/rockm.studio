---
layer: company
criticality: optional
enabled_in_production: no
---

# 12 — Load Balancer

> Layer 2 — Company Layer
>
> **Disabled in Production Mode.** Active only in Lean Autonomous, Company, or Experimental modes.

## 1 — Purpose

Distributes tasks across AI employees based on capacity, performance, and current workload.

---

## 2 — Scoring

Uses `load_score` as defined in `core/09-performance-scoring.md` §4.

> **No scoring formula is defined here.** See `core/09-performance-scoring.md` for the authoritative formula.

---

## 3 — Selection Logic

1. Filter employees by role_code matching task requirement
2. Filter by status = active
3. Filter by team_id if cross-team not allowed
4. Score remaining candidates using `load_score`
5. Select highest scoring employee
6. Assign task to employee's agent role

---

## 4 — Rules

- Load balancer is advisory — founder can override
- Does not modify task lifecycle directly
- Calls TaskService.assignTask() after selection
- Respects max_parallel_tasks limit per employee

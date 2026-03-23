# 12 — Load Balancer

> Layer 2 — Company Layer

## 1 — Purpose

Distributes tasks across AI employees based on capacity, performance, and current workload.

---

## 2 — Scoring Formula

```
load_score = (capacity_score * 0.3) + (performance_score * 0.4) + (availability * 0.3)
```

Where:
- `capacity_score` = max_parallel_tasks − current_active_tasks
- `performance_score` = agent role's rolling performance score
- `availability` = 1 if employee status is active, 0 otherwise

---

## 3 — Selection Logic

1. Filter employees by role_code matching task requirement
2. Filter by status = active
3. Filter by team_id if cross-team not allowed
4. Score remaining candidates
5. Select highest scoring employee
6. Assign task to employee's agent role

---

## 4 — Rules

- Load balancer is advisory — founder can override
- Does not modify task lifecycle directly
- Calls TaskService.assignTask() after selection
- Respects max_parallel_tasks limit per employee

---
layer: company
criticality: optional
enabled_in_production: no
doc_kind: reference
load_strategy: retrieve
---

# 10 — Department System

> Layer 2 — Company Layer
>
> **Disabled in Production Mode.** Active only in Lean Autonomous, Company, or Experimental modes.

## 1 — Purpose

Defines the team/department organizational structure that groups agent roles and employees.

**Does NOT define new state transitions or override core lifecycle.** Teams are organizational containers only.

---

## 2 — Entities

### Team

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | string | e.g. "Engineering", "Product" |
| code | string | Unique identifier |
| status | string | active, inactive |
| created_at | timestamp | |
| updated_at | timestamp | |

### Company Mode Settings

| Field | Type | Notes |
|-------|------|-------|
| enable_multi_team | boolean | Default false |
| cross_team_allowed | boolean | Default false |
| max_parallel_projects | integer | Default 3 |

---

## 3 — Relationships

- Team 1:N AgentRole
- Team 1:N AIEmployee
- Team 1:N ModelBenchmark
- Project N:1 Team (optional)

---

## 4 — Rules

- Teams are organizational containers, not workflow entities
- Teams do not own lifecycle states (lifecycle defined in `core/03-state-machine.md`)
- Cross-team task assignment requires `cross_team_allowed = true`
- Department system is optional — Core Engine operates without it

---

## 5 — UI Representation (v2.1)

The Company page (`/company`) presents three internal departments as clickable cards:

| Card | Badge Color | Data Source |
|------|-------------|-------------|
| HR Department | Blue | `useHRDashboard` → `ai_employees`, `hr_suggestions` |
| AI Talent Market | Cyan | `useHiringMarket` → `model_market`, `model_benchmarks`, `prompt_experiments` |
| Media & SMM | Green | `useBlogPosts` → `blog_posts` |

Each card shows summary metrics on the overview and drills into a sub-view.
Navigation does not change — Company remains a secondary nav item under Management.

---

## 6 — Front Office Integration (v2.3)

Departments are linked to Front Office via `intake_requests.department_id`:

```
IntakeRequest → department_id → Department
  → BlueprintContract → EstimateReport → LaunchDecision → Project
```

The department determines which teams and roles are available for the resulting project.
IntakeRequests can be filtered by department for workload tracking.

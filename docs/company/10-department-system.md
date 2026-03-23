# 10 — Department System

> Layer 2 — Company Layer

## 1 — Purpose

Defines the team/department organizational structure that groups agent roles and employees.

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
- Teams do not own lifecycle states
- Cross-team task assignment requires `cross_team_allowed = true`
- Department system is optional — Core Engine operates without it

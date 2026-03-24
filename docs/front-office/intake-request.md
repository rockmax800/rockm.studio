---
layer: front-office
criticality: critical
enabled_in_production: yes
doc_kind: contract
load_strategy: auto
---

# Intake Request

> Front Office — Client lifecycle before Project creation.

## 1 — Purpose

The Intake Request captures a client's initial business goal and constraints before any technical scoping begins. It is the entry point for all work.

---

## 2 — Entity Fields

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| client_name | string | Who requested the work |
| business_goal | text | What the client wants to achieve |
| target_users_json | jsonb | Who will use the result |
| success_metrics_json | jsonb | How success is measured |
| constraints_json | jsonb | Budget, timeline, tech constraints |
| non_goals_json | jsonb | Explicitly out of scope |
| risk_class | string | low / medium / high |
| department_id | uuid | FK — optional department assignment |
| status | string | draft → discussed → blueprint_created |
| created_at | timestamp | |

---

## 3 — Lifecycle

```
draft → discussed → blueprint_created
```

- **draft**: Initial capture of client intent.
- **discussed**: Founder has reviewed and clarified requirements.
- **blueprint_created**: A BlueprintContract has been generated from this request.

---

## 4 — Rules

- Every project must originate from an IntakeRequest.
- IntakeRequests are never deleted — they form the audit trail of client intent.
- Status transitions are forward-only.

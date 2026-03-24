---
layer: front-office
criticality: critical
enabled_in_production: yes
---

# Launch Decision

> Front Office — Founder gate before project creation.

## 1 — Purpose

The final founder decision on whether to proceed with project creation. Project creation is **blocked** unless a LaunchDecision with `decision=approved` exists.

---

## 2 — Entity Fields

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| estimate_report_id | uuid | FK |
| decision | string | approved / rejected / deferred |
| founder_note | text | Optional reasoning |
| created_at | timestamp | |

---

## 3 — Decision Flow

```
IntakeRequest → BlueprintContract → EstimateReport → LaunchDecision
                                                          │
                                                    approved → Project created
                                                    rejected → No project
                                                    deferred → Revisit later
```

---

## 4 — Rules

- Only one decision per EstimateReport.
- Decision is final — no edits, only new decisions on new estimates.
- `deferred` does not block future re-estimation.

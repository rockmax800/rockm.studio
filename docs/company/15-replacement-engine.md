---
layer: company
criticality: optional
enabled_in_production: no
---

# 15 — Replacement Engine

> Layer 2 — Company Layer
>
> **Disabled in Production Mode.** Active only in Company or Experimental modes.

## 1 — Purpose

Generates employee replacement proposals when performance drops below thresholds.

---

## 2 — Trigger Conditions

- Employee `success_rate < 0.5` over last 20 runs
- Employee `bug_rate > 0.3`
- Employee `escalation_rate > 0.4`
- Model deprecated by provider

Performance metrics defined in `core/09-performance-scoring.md` §7.

---

## 3 — Candidate Proposals

| Field | Type | Notes |
|-------|------|-------|
| employee_id | uuid | FK — employee to replace |
| reason | string | Why replacement suggested |
| suggested_provider | string | |
| suggested_model | string | |
| suggested_prompt_version_id | uuid | |
| projected_success_rate | numeric | |
| projected_cost | numeric | |
| projected_latency | numeric | |
| approved | boolean | Default false |
| executed | boolean | Default false |

---

## 4 — Safety Rules

- Proposals are suggestions only — never auto-executed
- Founder must approve before any change
- Replacement happens on next hire cycle, not mid-task
- Old employee data is preserved for audit

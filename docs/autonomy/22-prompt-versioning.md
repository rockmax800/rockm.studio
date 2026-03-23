# 22 — Prompt Versioning

> Layer 3 — Autonomy & Evolution

## 1 — Purpose

Version control for agent prompts with A/B experiment support.

---

## 2 — Prompt Versions

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| role_id | uuid | FK to AgentRole |
| version_number | integer | Sequential |
| full_prompt | text | Complete prompt template |
| is_active | boolean | Currently deployed version |
| performance_snapshot | jsonb | Metrics at time of creation |
| created_by | string | founder, system, experiment |

---

## 3 — Prompt Experiments

| Field | Type | Notes |
|-------|------|-------|
| role_id | uuid | FK |
| base_version_id | uuid | Control prompt |
| experimental_version_id | uuid | Challenger prompt |
| traffic_percentage | numeric | % of runs using experimental |
| status | string | active, completed, cancelled |
| performance_delta | jsonb | Measured difference |
| start_date | timestamp | |
| end_date | timestamp | |

---

## 4 — Experiment Flow

1. Create new prompt version
2. Create experiment with traffic split (e.g. 20% experimental)
3. System routes runs to base or experimental based on traffic %
4. After sufficient sample size, compare performance
5. Generate recommendation (NOT auto-deploy)
6. Founder approves or rejects promotion

---

## 5 — Safety

- Experimental prompts never used for production-critical tasks without approval
- Founder can cancel any experiment
- Rollback to previous version always available

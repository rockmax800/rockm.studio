# 13 — Hiring Market

> Layer 2 — Company Layer

## 1 — Purpose

Provides a marketplace view of available AI models with competitive scoring to inform hiring decisions.

---

## 2 — Model Market Entity

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| provider | string | e.g. "openai", "anthropic" |
| model_name | string | e.g. "gpt-4o", "claude-3.5-sonnet" |
| max_context | integer | Token limit |
| estimated_cost_per_1k_tokens | numeric | |
| avg_latency_score | numeric | 0–1 |
| avg_quality_score | numeric | 0–1 |
| reliability_score | numeric | 0–1 |
| last_updated | timestamp | |

---

## 3 — Model Benchmarks

| Field | Type | Notes |
|-------|------|-------|
| model_market_id | uuid | FK |
| team_id | uuid | FK (optional) |
| avg_success_rate | numeric | |
| avg_cost | numeric | |
| avg_latency | numeric | |
| bug_rate | numeric | |
| sample_size | integer | |

Updated periodically from AIEmployee run data via `update-benchmarks` edge function.

---

## 4 — Competitive Scoring

```
competition_score =
  (avg_success_rate × 0.4) +
  (1 / (1 + avg_cost) × 0.2) +
  (1 / (1 + avg_latency) × 0.1) +
  (reliability_score × 0.2) +
  (avg_quality_score × 0.1)
```

---

## 5 — Upgrade Suggestions

If top-ranked model ≠ current best employee model AND performance delta > 10%:
- Create HR suggestion: `suggestion_type = "upgrade_model"`
- Include projected improvements
- Do NOT auto-execute — founder approval required

---

## 6 — Safety

- Never auto-hire without founder approval
- Never auto-replace active employees
- Only apply on next hire cycle
- All proposals through approval endpoint

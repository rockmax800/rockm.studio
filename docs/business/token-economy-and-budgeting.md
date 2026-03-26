---
layer: cross-cutting
criticality: critical
enabled_in_production: yes (budget tracking always active)
doc_kind: reference
load_strategy: retrieve
---

# 28 — Token Economy & Budgeting

## 1 — Purpose

Documents token costs across all system modules and defines budgeting controls.

---

## 2 — Cost by Module

| Module | Token Impact | Frequency | Controllable? | Disabled in Production? |
|--------|-------------|-----------|--------------|------------------------|
| Core workflow (runs) | High | Per task | Yes — retry limits | No |
| Provider routing | None (DB lookup) | Per run | — | No |
| Guard validation | None (pure logic) | Per transition | — | No |
| Context assembly | Medium | Per run | Yes — compression | No |
| Review execution | High | Per artifact | Yes — skip self-review | No |
| Dual verification | High (2× cost) | Per run | Yes — feature flag | **Yes** |
| Self-review | Medium | Per run | Yes — feature flag | **Yes** |
| Autonomy pipeline | Very High (24–72 calls) | Per idea | Yes — feature flag | **Yes** |
| Blog generation | Medium | Per event | Yes — feature flag | **Yes** |
| Prediction engine | Low | Periodic | Yes — mode check | **Yes** |
| Prompt experiments | Medium | Per experiment run | Yes — feature flag | **Yes** |
| Context compression | Low–Medium | Per large context | Yes — feature flag | **Yes** |

---

## 3 — Budget Hierarchy

```
System Budget
  └── Project Budget (autonomy_token_budget)
       └── Task Budget (implicit — retry limits)
            └── Run Budget (single provider call)
```

---

## 4 — Cost Multipliers

| Feature | Multiplier |
|---------|-----------|
| Standard run | 1× |
| Run with self-review | 1.5× |
| Run with dual verification | 2× |
| Run with self-review + dual verification | 2.5× |
| Autonomy idea → full execution chain | 24–72× |
| Blog draft per event | 1× |

---

## 5 — Cost Tracking

All provider calls logged in `provider_usage_logs`:
- Input/output tokens
- Estimated cost USD
- Provider and model
- Linked to run and project

---

## 6 — Budget Alerts

Recommended thresholds:
- 80% of project budget: warning
- 95% of project budget: pause autonomy
- 100% of project budget: halt all non-essential runs

---

## 7 — Relationship to Market Benchmarking

Token economy tracks **actual AI costs** (AIC). The Market Benchmarking Engine (`market-benchmarking-engine.md`) consumes AIC as a **read-only input** to compare against human-equivalent costs and founder offer price. Token budgeting does not depend on benchmarking, and benchmarking never modifies budget limits or cost ceilings. They are independent modules with a one-directional data flow: Token Economy → Benchmarking (read-only).

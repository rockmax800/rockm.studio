# Token Economy & Budgeting

## 1 — Purpose

Documents token costs across all system modules and defines budgeting controls.

---

## 2 — Cost by Module

| Module | Token Impact | Frequency | Controllable? |
|--------|-------------|-----------|--------------|
| Core workflow (runs) | High | Per task | Yes — retry limits |
| Provider routing | None (DB lookup) | Per run | — |
| Guard validation | None (pure logic) | Per transition | — |
| Context assembly | Medium | Per run | Yes — compression |
| Review execution | High | Per artifact | Yes — skip self-review |
| Dual verification | High (2× cost) | Per run | Yes — disable in routing policy |
| Self-review | Medium | Per run | Yes — disable |
| Autonomy pipeline | Very High (24–72 calls) | Per idea | Yes — disable autonomy |
| Blog generation | Medium | Per event | Yes — max 3/day cap |
| Prediction engine | Low | Periodic | Yes — edge function schedule |
| Prompt experiments | Medium | Per experiment run | Yes — cancel experiment |
| Context compression | Low–Medium | Per large context | Yes — disable |

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

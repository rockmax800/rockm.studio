---
layer: autonomy
criticality: critical
enabled_in_production: yes (budget controls are always active)
---

# 26 — Safety & Budget Controls

> Layer 3 — Autonomy & Evolution

## 1 — Purpose

Defines budget limits, runaway prevention, and kill switches for autonomous and experimental features.

---

## 2 — Budget Controls

| Budget Type | Scope | Control |
|-------------|-------|---------|
| Project token budget | Per project | `autonomy_token_budget` setting |
| Department budget | Per team | Tracked via `provider_usage_logs` aggregation |
| Autonomy cycle budget | Per autonomy run | Max tokens per single autonomy cycle |
| Retry budget | Per task | Max retries before escalation |
| Blog generation budget | Daily | Max 3 drafts per day |
| Prediction engine budget | Periodic | Edge function invocation frequency |

---

## 3 — Kill Switches

| Switch | Effect | Feature Flag |
|--------|--------|-------------|
| Disable autonomy | Set all `autonomy_settings` to false/0 | `enable_autonomy` |
| Disable experiments | Cancel all active `prompt_experiments` | `enable_prompt_experiments` |
| Disable blog | Stop event detection | `enable_blog` |
| Disable predictions | Stop `run-predictions` edge function | N/A (mode check) |
| Disable dual verification | Skip second model call | `enable_dual_verification` |

For complete feature flag details, see `08-feature-flags.md`.

---

## 4 — Risk Matrix

See `29-risk-and-safety-matrix.md` for the complete, authoritative risk matrix.

> **No risk definitions are duplicated here.** Single source of truth is `29-risk-and-safety-matrix.md`.

---

## 5 — Monitoring Recommendations

- Track daily token usage per project
- Alert when usage exceeds 80% of budget
- Weekly review of autonomy pipeline outputs
- Monthly review of model performance trends

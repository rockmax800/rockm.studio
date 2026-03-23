# 26 — Safety & Budget Controls

> Layer 3 — Autonomy & Evolution

## 1 — Purpose

Defines budget limits, runaway prevention, and kill switches for autonomous and experimental features.

---

## 2 — Budget Controls

| Budget Type | Scope | Control |
|-------------|-------|---------|
| Project token budget | Per project | autonomy_token_budget setting |
| Department budget | Per team | Tracked via provider usage logs aggregation |
| Autonomy cycle budget | Per autonomy run | max tokens per single autonomy cycle |
| Retry budget | Per task | Max retries before escalation |
| Blog generation budget | Daily | Max 3 drafts per day |
| Prediction engine budget | Periodic | Edge function invocation frequency |

---

## 3 — Kill Switches

| Switch | Effect |
|--------|--------|
| Disable autonomy | Set all autonomy_settings to false/0 |
| Disable experiments | Cancel all active prompt_experiments |
| Disable blog | Stop event detection in CompanyMediaService |
| Disable predictions | Stop run-predictions edge function |
| Disable dual verification | Set enable_dual_verification=false in routing policies |

---

## 4 — Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Runaway automation | Medium | High | Token budget ceiling + max_autonomy_depth |
| Model degradation | Low | Medium | Performance monitoring + replacement proposals |
| HR misfire | Low | Low | All proposals require founder approval |
| Budget exhaustion | Medium | Medium | Per-project budget tracking + alerts |
| Real-time overload | Low | Low | Query consolidation + pagination |
| Prompt regression | Low | Medium | Experiment rollback + version history |

---

## 5 — Monitoring Recommendations

- Track daily token usage per project
- Alert when usage exceeds 80% of budget
- Weekly review of autonomy pipeline outputs
- Monthly review of model performance trends

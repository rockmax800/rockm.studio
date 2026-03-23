# Risk & Safety Matrix

## 1 — Purpose

Categorizes all identified risks with likelihood, impact, and mitigation strategies.

---

## 2 — Risk Categories

### 2.1 Runaway Automation

| Aspect | Detail |
|--------|--------|
| Risk | Autonomy pipeline creates unbounded LLM call chains |
| Likelihood | Medium |
| Impact | High (cost explosion, noise generation) |
| Mitigation | Token budget ceiling, max_autonomy_depth limit, kill switch |
| Detection | Monitor daily token usage, alert at 80% budget |

### 2.2 Model Degradation

| Aspect | Detail |
|--------|--------|
| Risk | Provider model quality drops after update |
| Likelihood | Low |
| Impact | Medium (quality regression in outputs) |
| Mitigation | Rolling performance monitoring, replacement proposals |
| Detection | success_rate drop below 0.5 threshold |

### 2.3 HR Misfire

| Aspect | Detail |
|--------|--------|
| Risk | System generates incorrect hiring/firing suggestions |
| Likelihood | Low |
| Impact | Low (suggestions only — founder approves) |
| Mitigation | All proposals require founder approval |
| Detection | Review suggestion accuracy periodically |

### 2.4 Budget Exhaustion

| Aspect | Detail |
|--------|--------|
| Risk | Token/cost budget exceeded without warning |
| Likelihood | Medium |
| Impact | Medium (unexpected provider costs) |
| Mitigation | Per-project budget tracking, alerts, auto-pause |
| Detection | Usage log aggregation, threshold alerts |

### 2.5 Real-Time Overload

| Aspect | Detail |
|--------|--------|
| Risk | Office visualization queries overload database |
| Likelihood | Low |
| Impact | Low (UI slowdown) |
| Mitigation | Query consolidation, pagination, caching |
| Detection | Monitor query count and latency |

### 2.6 Prompt Regression

| Aspect | Detail |
|--------|--------|
| Risk | New prompt version performs worse than previous |
| Likelihood | Low |
| Impact | Medium (quality degradation) |
| Mitigation | A/B experiments before deployment, rollback capability |
| Detection | Performance delta in experiment results |

### 2.7 Concurrency Conflicts

| Aspect | Detail |
|--------|--------|
| Risk | Multiple processes modify same entity simultaneously |
| Likelihood | Low |
| Impact | Medium (data inconsistency) |
| Mitigation | Optimistic locking (version field), Serializable transactions |
| Detection | ConcurrencyError exceptions in logs |

### 2.8 Provider Credential Exposure

| Aspect | Detail |
|--------|--------|
| Risk | API keys leak through logs or frontend |
| Likelihood | Low |
| Impact | High (unauthorized access) |
| Mitigation | Keys in env vars only, never in code or DB |
| Detection | Secret scanning, credential validation |

---

## 3 — Risk by Operating Mode

| Risk | Minimal Stable | Lean | Company | Experimental |
|------|---------------|------|---------|-------------|
| Runaway automation | None | None | None | **High** |
| Model degradation | Low | Low | Medium | Medium |
| HR misfire | None | None | Low | Low |
| Budget exhaustion | Low | Low | Medium | **High** |
| Real-time overload | None | None | Low | Low |
| Prompt regression | None | None | None | Medium |

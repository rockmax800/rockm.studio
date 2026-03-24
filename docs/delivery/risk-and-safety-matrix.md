---
layer: cross-cutting
criticality: critical
enabled_in_production: yes
doc_kind: reference
load_strategy: retrieve
---

# 29 — Risk & Safety Matrix

> **Single source of truth for all risk definitions.** No other document may define risk matrices.

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
| Mitigation | Token budget ceiling, max_autonomy_depth limit, kill switch (`enable_autonomy` flag) |
| Detection | Monitor daily token usage, alert at 80% budget |
| **Disabled in Production** | **Yes** — autonomy pipeline blocked |

### 2.2 Model Degradation

| Aspect | Detail |
|--------|--------|
| Risk | Provider model quality drops after update |
| Likelihood | Low |
| Impact | Medium (quality regression in outputs) |
| Mitigation | Rolling performance monitoring via `core/09-performance-scoring.md`, replacement proposals |
| Detection | `success_rate` drop below 0.5 threshold |

### 2.3 HR Misfire

| Aspect | Detail |
|--------|--------|
| Risk | System generates incorrect hiring/firing suggestions |
| Likelihood | Low |
| Impact | Low (suggestions only — founder approves) |
| Mitigation | All proposals require founder approval |
| Detection | Review suggestion accuracy periodically |
| **Disabled in Production** | **Yes** — HR features blocked |

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
| **Disabled in Production** | **Yes** — office disabled |

### 2.6 Prompt Regression

| Aspect | Detail |
|--------|--------|
| Risk | New prompt version performs worse than previous |
| Likelihood | Low |
| Impact | Medium (quality degradation) |
| Mitigation | A/B experiments before deployment, rollback capability |
| Detection | Performance delta in experiment results |
| **Disabled in Production** | **Yes** — experiments blocked |

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

### 2.9 Stalled Execution

| Aspect | Detail |
|--------|--------|
| Risk | Runs, CI, or deployments stall silently |
| Likelihood | Medium |
| Impact | Medium (delayed delivery, resource waste) |
| Mitigation | Stalled detection dashboard (`/api/system/stalled`), lease expiration, heartbeat monitoring |
| Detection | Automatic via `33-operational-diagnostics.md` — stalled runs, stuck CI, stuck deploys |

### 2.10 Resource Exhaustion

| Aspect | Detail |
|--------|--------|
| Risk | Worker CPU, memory, or disk reaches critical levels |
| Likelihood | Low |
| Impact | High (system degradation, run failures) |
| Mitigation | Resource monitoring (`/api/system/resources`), pressure level warnings |
| Detection | CPU > 80%, Memory > 85%, Disk > 90% thresholds |

---

### 2.11 Secret Leakage

| Aspect | Detail |
|--------|--------|
| Risk | Secrets exposed via logs, event_log, or sandbox environment |
| Likelihood | Medium |
| Impact | High (unauthorized access, credential compromise) |
| Mitigation | Secret injection matrix (see `delivery/runtime-and-secret-governance.md`), log masking, event_log sanitization |
| Detection | Secret scanning, audit of event_log payloads |

### 2.12 Sandbox Escape

| Aspect | Detail |
|--------|--------|
| Risk | Code in sandbox gains access to host or deploy credentials |
| Likelihood | Low |
| Impact | Critical (full system compromise) |
| Mitigation | Docker no-new-privileges, non-root user, no deploy creds in container, no docker socket mount |
| Detection | Container security monitoring |

### 2.13 Credential Misuse

| Aspect | Detail |
|--------|--------|
| Risk | Agent uses scoped credentials beyond intended purpose |
| Likelihood | Low |
| Impact | High (unauthorized repository changes, force push) |
| Mitigation | Repo-scoped GitHub tokens, branch protection, read-only in sandbox |
| Detection | GitHub audit log, git operation monitoring |

### 2.14 Domain Misbinding

| Aspect | Detail |
|--------|--------|
| Risk | DNS records point to wrong target or unauthorized domain |
| Likelihood | Low |
| Impact | Medium (traffic hijacking, TLS errors) |
| Mitigation | DomainBinding requires founder approval, DNS creds not in sandbox |
| Detection | Health check monitoring, DNS validation |

### 2.15 Destructive Git Operations

| Aspect | Detail |
|--------|--------|
| Risk | Force push, branch deletion, or history rewrite |
| Likelihood | Low |
| Impact | High (code loss, audit trail corruption) |
| Mitigation | Scoped tokens, branch protection rules, no force push allowed |
| Detection | GitHub webhook events, audit log |

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
| Stalled execution | Low | Low | Medium | Medium |
| Resource exhaustion | Low | Low | Medium | Medium |
| Secret leakage | Low | Low | Low | Medium |
| Sandbox escape | Low | Low | Low | Low |
| Credential misuse | Low | Low | Low | Medium |
| Domain misbinding | Low | Low | Low | Low |
| Destructive git ops | Low | Low | Low | Medium |

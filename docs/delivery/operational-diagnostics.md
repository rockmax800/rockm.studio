---
layer: core
criticality: important
enabled_in_production: yes
doc_kind: reference
load_strategy: retrieve
---

# 33 — Operational Diagnostics

> Layer 1 — Core Engine
>
> Read-heavy, write-light observability layer. No business logic changes.

## 1 — Purpose

Makes the system operationally transparent through structured diagnostic endpoints. Enables the founder to monitor system health, detect stalls, and classify failures — all without modifying delivery core.

---

## 2 — Diagnostic Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/runs/:id/diagnostics` | GET | Full run execution diagnostics |
| `/api/pull-requests/:id/ci` | GET | CI check suite status for a PR |
| `/api/deployments/:id` | GET | Deployment status with rollback info |
| `/api/system/workers` | GET | Worker node status and health |
| `/api/system/stalled` | GET | All stalled entities across system |
| `/api/system/resources` | GET | Resource metrics and pressure warnings |

---

## 3 — Run Diagnostics (`/api/runs/:id/diagnostics`)

Returns comprehensive execution state:

| Field | Source |
|-------|--------|
| lifecycle_state | runs.state |
| provider / model | Provider + ProviderModel lookup |
| sandbox_policy | SandboxPolicy details |
| lease_owner / lease_expires_at | Lease fields |
| heartbeat_at / heartbeat_stale | Heartbeat with 2-min threshold |
| error_class / exit_code | Failure classification (see doc 32) |
| logs_ref | Execution log path |
| input_tokens / output_tokens | Token usage |
| estimated_cost | Cost estimate |
| retry_count | Auto-retry counter |

---

## 4 — CI Diagnostics (`/api/pull-requests/:id/ci`)

Returns PR with all check suites:

- PR metadata (title, status, branches)
- Check suite history (status, duration, logs)
- `ci_passed` boolean for quick checks

---

## 5 — Deployment Diagnostics (`/api/deployments/:id`)

Returns deployment with:

- Environment, version, status
- Duration, preview URL, logs
- Rollback chain tracing
- `is_stuck` flag (deploying > 15 min)

---

## 6 — Worker Status (`/api/system/workers`)

### worker_nodes table

| Field | Purpose |
|-------|---------|
| hostname | Worker identifier |
| last_heartbeat_at | Last check-in |
| active_runs_count | Current workload |
| status | online / degraded / offline |
| cpu_usage_pct | CPU utilization |
| memory_usage_pct | Memory utilization |
| docker_container_count | Running containers |
| disk_usage_pct | Disk utilization |

### Derived Status

| Heartbeat Age | Derived Status |
|--------------|----------------|
| < 30s | online |
| 30s – 2min | degraded |
| > 2min | offline |

Workers must update heartbeat every 15 seconds.

---

## 7 — Stalled Detection (`/api/system/stalled`)

Detects three categories of stalls:

| Category | Threshold | Stall Reason |
|----------|-----------|-------------|
| Runs with expired lease | lease_expires_at < now | lease_expired |
| Runs with stale heartbeat | heartbeat_at < 2min ago | heartbeat_stale |
| Runs with no update | updated_at < 10min ago | no_update |
| CI stuck in running | started_at < 15min ago | — |
| Deploys stuck in deploying | started_at < 15min ago | — |

---

## 8 — Resource Monitoring (`/api/system/resources`)

### Pressure Levels

| Level | Condition |
|-------|-----------|
| normal | No warnings |
| elevated | 1-2 warnings |
| critical | 3+ warnings |

### Warning Triggers

| Metric | Threshold | Warning |
|--------|-----------|---------|
| Avg CPU | > 80% | "High CPU usage across workers" |
| Avg Memory | > 85% | "High memory usage across workers" |
| Max Disk | > 90% | "Disk usage critical on at least one worker" |
| Pending Outbox | > 100 | "Outbox backlog growing" |

---

## 9 — UI Integration

Founder → System → Health tab displays:

- Worker status cards (online/degraded/offline)
- Stalled runs with stall reason and duration
- Failed CI suites
- Stuck deployments
- Resource pressure level with warnings

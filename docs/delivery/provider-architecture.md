---
doc_kind: reference
load_strategy: retrieve
layer: delivery
criticality: high
---

# 08 — Provider Architecture

> Layer 1 — Core Engine

## 1 — Purpose

Defines how AI Workshop OS integrates model providers.
The system supports multiple providers without coupling workflow to any single vendor.

---

## 2 — Core Principle

Projects, tasks, runs, reviews, approvals, and artifacts belong to AI Workshop OS.
Providers only supply model execution.

- Provider state ≠ task state
- Provider response ≠ approval
- Provider output = artifact (not truth)
- Provider failure must not corrupt workflow state

---

## 3 — Provider Objects

| Object | Purpose |
|--------|---------|
| Provider | External AI provider record |
| ProviderModel | Model/execution target with capability metadata |
| ProviderCredential | Credential reference (secrets in env vars) |
| RoutingPolicy | Provider/model selection rules per role+domain |
| ProviderUsageLog | Request log with tokens, cost, latency |

---

## 4 — Routing Policy

Defines preferred provider/model per task domain and role code.

| Field | Purpose |
|-------|---------|
| task_domain | Which domain this policy applies to |
| role_code | Which agent role |
| preferred_provider_id | Primary provider |
| preferred_model_id | Primary model |
| fallback_provider_id | Backup provider |
| fallback_model_id | Backup model |
| allow_fallback | Whether fallback is permitted |
| allow_cross_provider_retry | Whether retry can switch providers |
| enable_dual_verification | Whether dual-model verification is active |

---

## 5 — Provider Health

Track per provider:
- Configured / reachable / last success / last failure / error rate
- Statuses: `healthy`, `degraded`, `unavailable`, `misconfigured`

---

## 6 — Cost Tracking

**Internal estimates:** For every request store provider, model, task, run, token usage, estimated cost.
**Provider reconciliation:** Later augment with official provider APIs where feasible.

---

## 7 — Fallback Rules

Fallback allowed only when explicitly configured:
- **Safe:** Founder brainstorming, non-critical drafting, summaries
- **Unsafe (needs approval):** Backend code, schema generation, architecture decisions, critical reviews

---

## 8 — Provider Failure Handling

| Outcome | Workflow Impact |
|---------|----------------|
| Run fails | Run → `failed`; retry or escalate |
| Run retries | New run via UC-16 supersede |
| Task blocked | Task → `blocked` |
| Task escalated | Task → `escalated` |
| Fallback attempted | Only if policy allows |

**Forbidden:** Silent provider switch on critical work; pretending completion after failure.

For full provider architecture details, see `docs/18-model-provider-architecture-v1.md`.

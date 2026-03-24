---
layer: core
criticality: important
enabled_in_production: yes
---

# 32 — Failure Classification

> Layer 1 — Core Engine
>
> Standardized error_class values for Run failure categorization.

## 1 — Purpose

Provides a canonical set of `error_class` values that all system components must use when recording run failures. Enables consistent filtering, alerting, and diagnostics across the entire execution pipeline.

---

## 2 — Standard error_class Values

| error_class | Source | Description |
|-------------|--------|-------------|
| `provider_timeout` | ProviderService | Model provider request timed out |
| `provider_rate_limit` | ProviderService | Provider returned 429 / rate limit exceeded |
| `provider_error` | ProviderService | Provider returned non-timeout error (5xx, auth, etc.) |
| `sandbox_timeout` | SandboxExecutorService | Container exceeded `sandbox_policy.timeout_seconds` |
| `sandbox_exit_error` | SandboxExecutorService | Container exited with non-zero exit code |
| `sandbox_oom` | SandboxExecutorService | Container killed by OOM (exit code 137) |
| `ci_failed` | DeliveryLaneService | GitHub Actions check suite failed |
| `deploy_failed` | DeliveryLaneService | Deployment failed (staging or production) |
| `lease_conflict` | RunExecutor | Could not acquire lease — held by another executor |
| `guard_error` | OrchestrationService | State transition guard rejected the operation |
| `concurrency_error` | OrchestrationService | Optimistic locking conflict (version mismatch) |
| `context_error` | ContextCompressionService | Context pack assembly or compression failed |
| `unknown_error` | Any | Unclassified error — investigate |

---

## 3 — Exit Code Mapping

| Exit Code | Meaning | error_class |
|-----------|---------|-------------|
| 0 | Success | — |
| 1 | General error | `sandbox_exit_error` |
| 124 | Timeout (from `timeout` utility) | `sandbox_timeout` |
| 125 | Docker failed to run | `sandbox_exit_error` |
| 137 | OOM killed (SIGKILL) | `sandbox_oom` |
| 139 | Segfault (SIGSEGV) | `sandbox_exit_error` |
| 143 | SIGTERM | `sandbox_exit_error` |

---

## 4 — Classification Rules

1. **Be specific**: Use the most specific error_class available. Never use `unknown_error` when a more precise class exists.
2. **Set early**: error_class must be set in the same transaction as the failure state transition.
3. **Immutable**: Once set, error_class should not be changed on a run.
4. **Provider errors**: Always distinguish between timeout, rate limit, and general provider errors.
5. **Sandbox errors**: Map exit codes to specific error classes per §3.

---

## 5 — Usage in Code

### RunExecutor (on failure)
```typescript
const errorClassName = error instanceof GuardError ? "guard_error"
  : error.message.includes("timed out") ? "provider_timeout"
  : error.message.includes("rate limit") ? "provider_rate_limit"
  : error.message.includes("lease") ? "lease_conflict"
  : error instanceof Error ? "provider_error"
  : "unknown_error";
```

### SandboxExecutorService (on container exit)
```typescript
const errorClassName = exitCode === 124 ? "sandbox_timeout"
  : exitCode === 137 ? "sandbox_oom"
  : exitCode !== 0 ? "sandbox_exit_error"
  : null;
```

---

## 6 — Diagnostics Integration

The `/api/runs/:id/diagnostics` endpoint exposes `error_class` alongside:
- `exit_code` — container exit code
- `failure_reason` — human-readable error description
- `logs_ref` — path to execution logs

The `/api/system/stalled` endpoint uses error_class for stall reason classification.

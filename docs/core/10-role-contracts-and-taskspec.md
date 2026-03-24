---
layer: core
criticality: critical
enabled_in_production: yes
doc_kind: contract
load_strategy: auto
---

# Role Contracts and TaskSpec

> Core Engine — Enforceable role boundaries and structured task specifications.

## 1 — Purpose

Introduces strict, enforceable contracts that define what each agent role may do, and structured specifications that define what each task requires. Together, they ensure agents operate within boundaries and tasks are verifiable.

---

## 2 — Role Contract Entity

Each agent role MAY reference a `role_contract` that constrains its behavior.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| role_code | text | Matches AgentRole.code |
| allowed_repo_paths_json | jsonb | Glob patterns: `["src/components/**", "src/pages/**"]` |
| forbidden_repo_paths_json | jsonb | Glob patterns: `["prisma/**", "supabase/**"]` |
| allowed_task_domains_json | jsonb | Domains this role may work on |
| required_artifacts_json | jsonb | Artifact categories the role must produce |
| required_verification_steps_json | jsonb | Steps that must be completed |
| risk_threshold | numeric | Maximum risk_class allowed |
| may_deploy | boolean | Whether role can trigger deployments |
| may_merge | boolean | Whether role can merge PRs |
| may_modify_schema | boolean | Whether role can change DB schema |
| created_at | timestamp | |

### 2.1 — Enforcement Points

| Point | Action |
|-------|--------|
| Pre-execution (UC-13) | Validate task domain against `allowed_task_domains_json` |
| Post-execution | Validate changed files against `allowed_repo_paths_json` / `forbidden_repo_paths_json` |
| PR merge (UC-06) | Check `may_merge` before PR creation |
| Deploy promotion | Check `may_deploy` before deployment |
| Schema migration | Check `may_modify_schema` before DB changes |

### 2.2 — Default Contracts by Role

| Role Code | Allowed Paths | Forbidden Paths | may_deploy | may_merge | may_modify_schema |
|-----------|--------------|-----------------|-----------|----------|-------------------|
| frontend_builder | `src/components/**`, `src/pages/**`, `src/hooks/**` | `prisma/**`, `supabase/**`, `app/api/**` | no | no | no |
| backend_implementer | `app/api/**`, `src/services/**`, `prisma/**` | `src/components/**`, `src/pages/**` | no | no | yes |
| solution_architect | `docs/**` | `src/**`, `app/**` | no | no | no |
| reviewer | — (read-only) | — | no | no | no |
| release_coordinator | — | — | yes | yes | no |

---

## 3 — TaskSpec Entity

Every implementation task SHOULD have a TaskSpec that provides structured execution guidance.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| task_id | uuid | FK — unique per task |
| goal | text | What the task must achieve |
| target_repository | text | Which repo to modify |
| allowed_repo_paths_json | jsonb | Task-level path allowlist |
| forbidden_repo_paths_json | jsonb | Task-level path blocklist |
| acceptance_criteria_json | jsonb | Structured acceptance criteria |
| verification_plan_json | jsonb | How to verify completion |
| risk_class | text | low / medium / high |
| requested_outcome | text | Expected output type |
| required_artifacts_json | jsonb | What artifacts must be produced |
| definition_of_done_json | jsonb | Checklist for task completion |
| created_at | timestamp | |

### 3.1 — TaskSpec vs Task.acceptance_criteria

`Task.acceptance_criteria` is a legacy field preserved for backward compatibility. `TaskSpec` provides a richer, more structured specification. When both exist, `TaskSpec` takes precedence.

---

## 4 — Artifact Category System

Artifacts are classified by category for structured tracking:

| Category | Description |
|----------|-------------|
| spec | Specification or design document |
| architecture | Architecture decision or diagram |
| implementation | Code or configuration output |
| review | Review notes or feedback |
| qa_evidence | Test results, coverage reports |
| release_note | User-facing release documentation |
| deployment_receipt | Deployment log or confirmation |

The `artifact_category` field is additive — the existing `artifact_type` enum is preserved.

---

## 5 — Enforcement Flow

### 5.1 — Pre-Execution (RunExecutor)

```
1. Load RoleContract for run.agent_role_id
2. Load TaskSpec for run.task_id
3. Validate task.domain ∈ contract.allowed_task_domains_json
4. If validation fails → GuardError, run does not start
```

### 5.2 — Post-Execution (RunExecutor)

```
1. Collect changedFiles from provider result
2. For each file:
   a. Check against contract.forbidden_repo_paths_json → violation
   b. Check against contract.allowed_repo_paths_json → must match at least one
   c. Check against taskSpec.forbidden_repo_paths_json → violation
   d. Check against taskSpec.allowed_repo_paths_json → must match at least one
3. Violations are logged and appended to artifact summary
4. Reviewer sees violations during review
```

### 5.3 — Review Enforcement (ReviewService)

```
1. On approval, verify:
   a. Required artifacts present (from contract + taskSpec)
   b. Log any missing artifacts as warnings
2. On rejection, include contract violations in rework handoff
```

---

## 6 — Backward Compatibility

- `role_contract_id` on `agent_roles` is nullable — roles without contracts operate as before.
- `task_specs` has a unique constraint on `task_id` — at most one spec per task.
- `artifact_category` is nullable — existing artifacts retain their `artifact_type` classification.
- No lifecycle transitions are changed. No state machine modifications.

---

## 7 — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `core/04-data-model.md` | RoleContract and TaskSpec are new entities |
| `core/05-guard-matrix.md` | Contract violations are guard-level checks |
| `core/06-orchestration-use-cases.md` | UC-03/UC-13 include contract validation |
| `delivery/backend-architecture.md` | RoleContractEnforcementService added to service map |

---
doc_kind: contract
load_strategy: auto
layer: delivery
criticality: critical
enabled_in_production: yes
---

# 41 — Hard Enforcement Layer

> Delivery Plane — Governance hardening layer.
>
> **Always active.** Converts soft contracts into hard delivery gates.

## 1 — Purpose

Ensures that role contracts, artifact completeness, and deployment preconditions are enforced as **hard gates** — not warnings. Violations block merge or deploy. No silent warnings. Deterministic behavior only.

---

## 2 — Design Principles

1. **Violations block** — no merge or deploy proceeds with outstanding violations
2. **No silent warnings** — every violation produces an `event_log` entry and metric
3. **Deterministic** — same inputs always produce the same enforcement decision
4. **No new autonomy** — enforcement only, no automatic remediation
5. **Metric visibility** — all violations counted and exposed in Founder Risk tab

---

## 3 — Enforcement Gates

### 3.1 — Role Contract Enforcement (Merge Block)

**Trigger:** Before PR merge.

**Checks:**
1. `changed_files` must not contain paths outside `allowed_repo_paths`
2. `changed_files` must not match any `forbidden_repo_paths` pattern
3. All `required_artifacts_json` must be present for the task

**On violation:**
- PR blocked (classification: `contract_violation`)
- `event_log` entry: `contract.violation`
- `enforcement_metrics` record created
- No merge allowed until resolved

### 3.2 — Artifact Completeness Enforcement

**Trigger:** Before PR merge.

**Required artifacts (all tasks):**
- `implementation_patch` exists
- `review_report` exists
- `tests_executed_json` not empty on at least one artifact

**Additional for high/critical risk_class:**
- `qa_evidence` exists

**On violation:**
- PR blocked (classification: `evidence_missing`)
- `enforcement_metrics` record created

### 3.3 — Deployment Gate Enforcement

**Trigger:** Before production deploy.

**Required:**
1. Staging deployment `status = live`
2. `DomainBindingSpec` exists for production environment
3. `DomainBindingSpec` approved via `Approval` entity (not boolean flag)
4. Health endpoint specified (check delegated to external executor)

**On violation:**
- Deploy blocked
- `event_log` entry: `deploy.blocked_missing_contract`
- `enforcement_metrics` record created

---

## 4 — CI Result Classification

| Classification | Meaning | Merge Allowed |
|---------------|---------|---------------|
| `passed` | All checks green | ✅ Yes |
| `failed` | CI test/build failure | ❌ No |
| `contract_violation` | Role contract boundary violated | ❌ No |
| `evidence_missing` | Required artifacts not present | ❌ No |
| `security_failed` | Security scan failure | ❌ No |

**Rule:** PR merge allowed ONLY if classification === `passed`.

---

## 5 — DomainBindingSpec Entity

New entity governing production domain requirements:

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| environment | text | Default: `production` |
| domain | text | Target domain |
| ssl_required | boolean | Default: true |
| expected_health_endpoint | text | Health check URL path |
| rollback_domain | text | Fallback domain |
| created_at | timestamp | |
| updated_at | timestamp | |

**Approval:** DomainBindingSpec approval goes through the `Approval` entity with `target_type = domain_binding_spec`. No boolean flags.

---

## 6 — Enforcement Metrics

| Metric | Description |
|--------|-------------|
| `contract_violations_count` | Role contract boundary violations |
| `blocked_merges_count` | PRs blocked from merge |
| `blocked_deploys_count` | Deployments blocked |

Recorded in `enforcement_metrics` table. Exposed in Founder → Risk tab via `HardEnforcementService.getMetricCounts()`.

---

## 7 — Combined Merge Gate Flow

```
PR ready to merge
  │
  ├─ 1. CI status check (existing DeliveryLaneService)
  │     └─ Not passed? → BLOCK (failed)
  │
  ├─ 2. Role contract enforcement
  │     └─ Path violations? → BLOCK (contract_violation)
  │     └─ Missing artifacts? → BLOCK (contract_violation)
  │
  ├─ 3. Artifact completeness enforcement
  │     └─ Missing evidence? → BLOCK (evidence_missing)
  │
  └─ All passed? → ALLOW merge
```

---

## 8 — Combined Deploy Gate Flow

```
Founder requests production promote
  │
  ├─ 1. Staging live? (existing DeliveryLaneService)
  │     └─ Not live? → BLOCK
  │
  ├─ 2. DomainBindingSpec exists?
  │     └─ Missing? → BLOCK
  │
  ├─ 3. DomainBindingSpec approved?
  │     └─ No Approval entity? → BLOCK
  │
  └─ All passed? → ALLOW production deploy
```

---

## 9 — Event Log Entries

| Event | When |
|-------|------|
| `contract.violation` | Role contract boundary violated |
| `deploy.blocked_missing_contract` | Production deploy blocked |

---

## 10 — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `delivery/delivery-lane.md` | Deploy gate integrated into §9 (Production Gate) |
| `delivery/sandbox-and-execution-isolation.md` | Sandbox does not bypass enforcement |
| `core/11-artifact-type-system.md` | Artifact categories used for completeness check |
| `core/10-role-contracts-and-taskspec.md` | Role contract boundaries enforced here |
| `delivery/runtime-and-secret-governance.md` | Security boundary enforcement |

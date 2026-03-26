---
doc_kind: adoption-plan
load_strategy: auto
layer: delivery
criticality: high
version: v1.0
---

# Agent Harness Patterns — Local Adoption Plan

> This document defines how external agent-harness concepts (verification loops, skill packs, memory persistence, harness interoperability) are adopted **locally** within AI Production Studio. No external repository is required at runtime or build time. All patterns are re-implemented under neutral naming that fits this product's domain model.

---

## 1 — Governing Principle

This product is a **founder-facing AI delivery studio**. External harness concepts are adopted only as internal engineering patterns. They never become product truth, user-facing branding, or runtime dependencies.

The canonical state model — `project → task → run → artifact → review → approval → deployment` — is inviolable. No adopted pattern may bypass, replace, or silently modify any entity in this chain.

---

## 2 — Hard Rules

| # | Rule | Consequence of Violation |
|---|------|--------------------------|
| HR-1 | **No self-modification without founder approval.** Any pattern that proposes changes to prompts, models, guidance, or execution policy must go through the approval entity. | Rejected at enforcement layer. |
| HR-2 | **No imported pattern may bypass the state model.** Skill packs, verification results, and memory entries are advisory inputs — they cannot create PRs, trigger deploys, or transition task state autonomously. | Blocked by guard matrix. |
| HR-3 | **No external runtime dependency.** Patterns are implemented locally. If an external harness (Claude Code, Codex CLI, OpenCode) is used as an execution engine, it operates behind the existing `ExecutionEngineAdapter` interface — never as a direct product integration. | Architecture violation. |
| HR-4 | **No silent learning.** Memory persistence and guidance refinement are founder-visible and founder-controlled. Nothing is "learned" without an auditable record. | Transparency violation. |

---

## 3 — Adoption Buckets

### 3.1 — Verification Rail

**What it means in this product:**
A mandatory verification step that validates run output before it can advance through the delivery pipeline. Inspired by verification-loop patterns in agent harnesses, but implemented as part of the existing evaluation rail (`docs/delivery/42-evaluation-rail.md`).

**What it is allowed to influence:**
- Run outcome scoring (pass / fail / rework)
- Artifact quality gates (implementation patch, review report, QA evidence)
- Security scan results attached to artifacts
- CI check suite status feeding into merge decisions

**What it must not change:**
- Task state directly (only via guard-protected transitions)
- Approval decisions (founder-only)
- Deployment triggers (require explicit approval + CI pass)

**Local implementation:**
- `EvaluationRailService` — runs protected scenarios against baselines
- `HardEnforcementService` — blocks advancement if gates fail
- `DualVerificationService` — cross-checks between independent evaluators
- Security scan results are stored as artifact metadata, not as autonomous actions

---

### 3.2 — Skill Packs & Guidance

**What it means in this product:**
Reusable bundles of prompt fragments, role instructions, anti-patterns, and domain rules that shape agent behavior during runs. Inspired by skill-pack and command/hook/rule abstractions in agent harnesses.

**What it is allowed to influence:**
- Context pack assembly (`context_packs` table)
- Prompt version content (`prompt_versions` table)
- Agent skill definitions (`agent_skills` table)
- Role contract enforcement boundaries (`role_contracts` table)
- Training session materials (`employee_training_materials` table)

**What it must not change:**
- Run execution flow (skill packs are inputs, not controllers)
- Task assignment logic (handled by orchestration service)
- Model selection (handled by execution policy)
- Any entity state without going through the state machine

**Local implementation:**
- Skill packs are stored as `agent_skills` rows linked to `agent_roles`
- Guidance is versioned through `prompt_versions` with founder approval
- Project-specific guidance is assembled into `context_packs` per task
- The `RoleContractEnforcementService` validates that agents operate within declared boundaries
- Training lab allows founder to author, review, and publish guidance — only published versions become active

---

### 3.3 — Project Memory

**What it means in this product:**
Structured persistence of project decisions, learned patterns, corrections, and context across sessions. Inspired by memory persistence patterns in agent harnesses, but implemented as founder-visible, auditable records.

**What it is allowed to influence:**
- Context pack content (what gets included in a run's context)
- Context snapshots (`context_snapshots` table)
- Training materials and correction history
- Founder calibration summaries

**What it must not change:**
- Historical run results (immutable once completed)
- Artifact content (immutable once submitted)
- Review decisions (immutable once recorded)
- Any state transition retroactively

**Local implementation:**
- `context_snapshots` — point-in-time project state summaries
- `context_packs` — assembled context per task with explicit provenance
- `employee_training_sessions` + `employee_prompt_drafts` — founder corrections stored as draft/published guidance
- `activity_events` — full audit trail of all state changes
- Memory is never "autonomous" — it is assembled by the context service and visible to the founder

---

### 3.4 — Harness Interoperability

**What it means in this product:**
The ability to use external agent harnesses (Claude Code, Codex CLI, OpenCode, or similar) as optional execution backends — without granting them product authority. Inspired by multi-harness orchestration patterns.

**What it is allowed to influence:**
- Run execution (as an `ExecutionEngineAdapter` implementation)
- Output content (code, text, artifacts produced by the harness)
- Telemetry (token usage, latency, cost reported back)

**What it must not change:**
- Product state model (project/task/run/artifact/review/approval/deployment)
- Approval flow (founder-only)
- Deployment pipeline (CI + approval required)
- Any entity outside the run's scoped workspace

**Local implementation:**
- External harnesses plug in via `ExecutionEngineAdapter` interface (`src/lib/execution/types.ts`)
- The engine registry (`src/lib/execution/engine-registry.ts`) resolves the active adapter
- Currently two adapters exist: `native` (production) and `ruflo` (experimental)
- Additional harness adapters follow the same contract: `createExecution` / `getExecutionStatus` / `cancelExecution`
- All harness output flows back through the standard artifact submission and review pipeline
- No harness may directly create PRs, trigger deployments, or modify project state

---

## 4 — What Is Explicitly Not Adopted

| Concept | Reason |
|---------|--------|
| Autonomous self-improvement | Violates HR-1. All improvement requires founder approval. |
| Plugin marketplace / installation UX | Not in scope. Skills are internal, not user-installable. |
| External memory graphs | Local context packs and snapshots are sufficient for v1. |
| Harness-native CI/CD | This product owns its own CI/CD pipeline via check suites and deployments. |
| Auto-merge or auto-deploy | Forbidden by operational constraints (`docs/product/constraints.md`). |
| Research-mode browsing | Agents do not autonomously browse external sources during runs. |

---

## 5 — Relationship to Existing Documents

| Document | Relationship |
|----------|-------------|
| `docs/delivery/42-evaluation-rail.md` | Verification Rail bucket extends this |
| `docs/delivery/41-hard-enforcement-layer.md` | Enforcement of all hard rules |
| `docs/core/10-role-contracts-and-taskspec.md` | Skill Packs operate within role contracts |
| `docs/autonomy/24-context-compression.md` | Project Memory uses context compression |
| `docs/integrations/01-ruflo-execution-engine.md` | Harness Interoperability follows this pattern |
| `docs/integrations/02-ruflo-adapter-contract.md` | Adapter interface contract |
| `docs/autonomy/26-safety-budget-controls.md` | Budget limits apply to all harness execution |
| `docs/product/constraints.md` | Operational constraints override all patterns |

---

## 6 — Decision

All four adoption buckets are approved for local implementation under the constraints defined above. No external repository is required. Future coding work should reference this document instead of external repository links.

**Founder approval required for:** any change that moves a bucket from advisory to state-modifying behavior.

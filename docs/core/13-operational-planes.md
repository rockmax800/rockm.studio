---
layer: core
criticality: critical
enabled_in_production: yes
---

# Operational Planes Architecture

> Core Engine — Defines the four operational planes and their dependency rules.

## 1 — Overview

The system is organized into four operational planes with a strict dependency hierarchy. Each plane has clear ownership of entities, defined read/write boundaries, and explicit constraints.

```
   EXPERIENCE (Plane 4) — visualization & interaction
        ↑ reads
   KNOWLEDGE  (Plane 3) — learning & proposals
        ↑ reads
   DELIVERY   (Plane 2) — deterministic execution
        ↑ reads
   INTENT     (Plane 1) — what & why
```

**Fundamental rule:** Dependencies flow upward only. No plane may write to a lower plane's canonical state.

---

## 2 — Plane 1: Intent

### Purpose
Captures **what** to build and **why**. Defines scope, constraints, and acceptance criteria before and during execution.

### Owned Entities

| Entity | Description |
|--------|-------------|
| `intake_requests` | Client brief capture |
| `blueprint_contracts` | Structured scope agreement |
| `estimate_reports` | Cost and timeline projections |
| `launch_decisions` | Founder go/no-go gate |
| `presale_sessions` | Lightweight pre-engagement scoping |
| `task_specs` | Per-task acceptance criteria, allowed paths, verification plan |
| `clients` | Client identity records |
| `client_project_access` | Client portal access tokens |

### Constraints

| Rule | Enforcement |
|------|------------|
| Must NOT execute code | No run creation or provider calls |
| Must NOT modify repositories | No workspace or PR operations |
| Must NOT deploy | No deployment creation |
| Must NOT transition delivery entities | No OrchestrationService calls |

### Interaction with Delivery
Intent entities are **consumed** by Delivery Plane:
- `launch_decision.approved` → triggers `project.activated`
- `task_spec` → consumed by RunExecutor for path validation
- `blueprint_contract` → referenced by project for scope

---

## 3 — Plane 2: Delivery

### Purpose
The deterministic execution engine. Defines **how** things are built, tested, reviewed, and deployed.

### Owned Entities

**Core workflow:**

| Entity | Description |
|--------|-------------|
| `projects` | Top-level lifecycle container |
| `tasks` | Units of work |
| `runs` | Execution attempts |
| `artifacts` | Typed evidence outputs |
| `reviews` | Quality verification |
| `approvals` | Founder decision gates |
| `handoffs` | Role-to-role transfers |
| `agent_roles` | Execution role definitions |
| `role_contracts` | Enforceable role boundaries |

**Delivery spine:**

| Entity | Description |
|--------|-------------|
| `repositories` | Git repository references |
| `repo_workspaces` | Isolated worktrees |
| `pull_requests` | Code review units |
| `check_suites` | CI results |
| `deployments` | Release records |
| `domain_bindings` | DNS/TLS bindings |
| `sandbox_policies` | Execution isolation rules |

**Event infrastructure:**

| Entity | Role |
|--------|------|
| `event_log` | Canonical source of truth (append-only) |
| `outbox_events` | External dispatch queue |
| `activity_events` | Backward-compatible projection |
| `office_events` | Office visualization projection |

### Constraints

| Rule | Enforcement |
|------|------------|
| All state changes via OrchestrationService | safePrisma blocks direct state writes |
| Optimistic locking on all entities | version field + Serializable isolation |
| event_log written in same transaction | Atomic with state change |
| Deterministic — no randomness in transitions | Guards are pure validation |

---

## 4 — Plane 3: Knowledge

### Purpose
Learning, improvement, and performance measurement. All operations are **advisory** — Knowledge Plane proposes but never directly mutates Delivery state.

### Owned Entities

| Entity | Description |
|--------|-------------|
| `prompt_versions` | Versioned prompt templates |
| `prompt_experiments` | A/B testing configurations |
| `prompt_improvement_suggestions` | AI-generated prompt improvements |
| `learning_proposals` | Formal improvement proposals with evidence & promotion pipeline |
| `evaluation_runs` | Isolated execution for shadow testing (never mutates delivery) |
| `context_snapshots` | Reproducibility snapshots |
| `context_packs` | Assembled execution context |
| `model_market` | Available models registry |
| `model_benchmarks` | Provider model performance data |
| `bottleneck_predictions` | Proactive risk detection |
| `hr_suggestions` | Employee improvement proposals |
| `candidate_proposals` | Replacement candidate suggestions |
| `ai_employees` | Named employee records with metrics |
| `agent_skills` | Skill fragments attached to roles |

### Constraints

| Rule | Enforcement |
|------|------------|
| Must NOT update task/run/artifact state | No OrchestrationService calls |
| Must NOT create runs or artifacts | Read-only on Delivery entities |
| Must NOT trigger deployments | No deployment creation |
| May INSERT proposals and scores | Append-only advisory records |
| Proposals require founder approval | approval gate before execution |
| Learning proposals require ≥3 source runs | Evidence minimum enforced at creation |
| Promotion requires statistical significance | Enforced by LearningPipelineService |

### Interaction with Delivery
- **Reads:** run results, artifact content, review verdicts, scoring data
- **Writes:** proposals (hr_suggestions, candidate_proposals, prompt_improvement_suggestions)
- **Proposals flow:** Knowledge creates proposal → Founder approves → Delivery executes change

---

## 5 — Plane 4: Experience

### Purpose
All user-facing surfaces. Experience Plane is **read-only** on canonical state — it consumes projections and renders visualization.

### Owned Surfaces

| Surface | Audience | Data Source |
|---------|----------|-------------|
| Founder Dashboard | Founder | Delivery entities + event_log |
| Pixel Office | Founder | office_events + agent_roles |
| Client Portal | External clients | Filtered project/milestone state |
| Company Dashboard | Founder | Knowledge + Company entities |
| Blog | Public | blog_posts |
| System/Diagnostics | Founder | Delivery + Knowledge metrics |

### Constraints

| Rule | Enforcement |
|------|------------|
| Must NOT write event_log | Read-only access |
| Must NOT mutate entity state | No direct DB writes to Delivery entities |
| Must NOT trigger transitions | No OrchestrationService calls |
| User actions route through API | API endpoints call Delivery Plane services |

### User Action Flow
```
User clicks "Approve" in UI (Experience)
  → API route receives request
    → Delivery Plane service executes transition
      → event_log updated
        → Experience reads updated projection
```

---

## 6 — Dependency Matrix

| From ↓ / To → | Intent | Delivery | Knowledge | Experience |
|----------------|--------|----------|-----------|------------|
| **Intent** | — | ✅ writes (launch→project) | ❌ | ❌ |
| **Delivery** | ✅ reads (specs, blueprints) | — | ✅ reads (prompts, context) | ❌ |
| **Knowledge** | ❌ | ✅ reads (results, metrics) | — | ❌ |
| **Experience** | ✅ reads (presale data) | ✅ reads (projections) | ✅ reads (scores) | — |

**Forbidden dependencies (enforced by architecture):**
- ❌ Knowledge → Intent (knowledge cannot redefine scope)
- ❌ Experience → Delivery writes (UI cannot mutate state directly)
- ❌ Knowledge → Delivery writes (proposals only, never direct mutation)
- ❌ Any plane → lower plane writes (strict upward-only dependency)

---

## 7 — Event Flow Across Planes

```
INTENT                                DELIVERY
  │                                      │
  │ launch_decision.approved ──────────→ │ project.activated
  │                                      │ task.created
  │                                      │ run.running
  │                                      │ run.produced_output
  │                                      │ review.resolved
  │                                      │       │
  │                                      │       ├──→ event_log (canonical)
  │                                      │       ├──→ outbox_events (dispatch)
  │                                      │       ├──→ activity_events (projection)
  │                                      │       │
                                 KNOWLEDGE       │          EXPERIENCE
                                    │            │              │
                                    │ ←── reads ─┘              │
                                    │                           │
                                    │ scoring, proposals        │ ←── reads projections
                                    │                           │
                                    │ proposal.created ─────→   │ renders in dashboard
```

---

## 8 — Production Mode Plane Restrictions

| Plane | Production Mode | Experimental Mode |
|-------|----------------|-------------------|
| Intent | Full functionality | Full functionality |
| Delivery | Full functionality | Full functionality |
| Knowledge | Scoring + snapshots only | Full (A/B experiments, model competition, compression) |
| Experience | Full functionality | Full + autonomy indicators |

In Production Mode, Knowledge Plane features like prompt A/B testing, model competition, and autonomous context compression are disabled. Only scoring and snapshot capture remain active.

---

## 9 — Mapping to Documentation Structure

| Plane | Documentation Folders |
|-------|----------------------|
| Intent | `front-office/`, `core/10-role-contracts-and-taskspec.md` (TaskSpec section) |
| Delivery | `core/`, `delivery/` |
| Knowledge | `autonomy/`, `company/14-*`, `company/18-*`, `core/09-*` |
| Experience | `company/17-*`, `front-office/client-portal.md` |
| Cross-cutting | `business/`, `product/`, `00-system-overview.md` |

---

## 10 — Validation Checklist

When adding new features or entities, verify:

- [ ] Which plane does this entity belong to?
- [ ] Does it respect the dependency rule (no reverse writes)?
- [ ] If Knowledge Plane: does it only propose, never mutate?
- [ ] If Experience Plane: does it only read projections?
- [ ] If Delivery Plane: does it go through OrchestrationService?
- [ ] If Intent Plane: does it avoid execution or deployment?

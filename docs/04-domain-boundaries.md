# 04 — Domain Boundaries

## 1 — Purpose

This document defines the core domains of AI Workshop OS, their responsibilities, ownership boundaries, allowed interactions, and isolation rules.

The goal is to prevent:

- agent confusion
- architecture drift
- accidental cross-domain changes
- hidden coupling between planning, execution, review, and release

Each domain must have a clear purpose, explicit inputs and outputs, and limited permissions.

---

## 2 — Domain Map

| Domain | Purpose | Owns | Does Not Own |
|---|---|---|---|
| Founder Control Plane | Founder-facing control layer for decisions and approvals | projects, approvals, final decisions, visibility | code execution, implementation logic |
| Product OS Docs | Canonical project documentation and operating rules | briefs, domain docs, state docs, collaboration rules, decisions | runtime execution, code changes |
| Task Orchestration | Manages task lifecycle and agent handoffs | tasks, assignments, queues, task status, dependencies | code artifacts, final product docs |
| Agent Registry | Defines agent roles and capabilities | agent profiles, permissions, skills, role constraints | project decisions, task execution history |
| Context Assembly | Builds task-ready context packs for agents | context packs, context snapshots, retrieval rules, compression outputs | source-of-truth docs, final implementation |
| Execution Runs | Executes agent work in isolated runs | runs, run logs, workspace sessions, retries, run outcomes | project strategy, final approvals |
| Artifact Registry | Stores outputs produced by tasks and runs | docs, specs, code diffs, schemas, test reports, review notes | task routing, approval authority |
| Frontend Delivery | Owns UI-facing implementation flow | screens, components, frontend tasks, frontend artifacts | backend architecture, database authority |
| Backend Delivery | Owns backend implementation flow | services, APIs, schema tasks, migrations, backend artifacts | product strategy, final release approval |
| Review & QA | Verifies artifacts and returns work if needed | review decisions, defects, test plans, test reports, validation status | original implementation ownership |
| GitHub Integration | Syncs repository work with external code hosting | branches, PR metadata, commit references, check status | product decisions, agent rules |
| Observability & Audit | Makes execution inspectable and recoverable | event log, audit log, metrics, failure traces | implementation decisions, business rules |
| Reference Examples | Stores approved examples for repeatable execution | golden examples, templates, canonical samples | task execution state, live code changes |
| Voice Interface (optional, later) | Voice interaction layer for founder or agents | voice sessions, transcripts, voice commands | core orchestration, canonical truth |

---

## 3 — Boundary Principles

### 3.1 Canonical truth lives in documents, not in chat history

Chat may help generate ideas.
Canonical truth must live in structured documents or explicit system records.

### 3.2 Tasks are not runs

A Task is a unit of work.
A Run is one execution attempt by one agent against one task.

### 3.3 Reviews are independent from implementation

The same role that implements work must not be the final reviewer for that same work.

### 3.4 Context is assembled, not dumped

Agents must not receive the entire repository or all project history by default.
They receive a scoped context pack.

### 3.5 Artifacts are outputs, not truth by default

Generated code, notes, or reports are artifacts.
They become trusted only after review or founder approval, depending on type.

### 3.6 Approval authority remains with founder

The founder is the final authority for:

- scope changes
- architecture shifts
- database-impacting changes
- release decisions

---

## 4 — Detailed Domain Definitions

## 4.1 Founder Control Plane

### Purpose

Provide one dashboard where the founder can create projects, inspect status, approve decisions, reject outputs, and trigger flows.

### Owns

- project creation
- priority setting
- approval decisions
- manual overrides
- release go / no-go
- visibility across all domains

### Inputs

- project briefs
- task status
- review reports
- run summaries
- risk signals

### Outputs

- approvals
- rejections
- priority changes
- scope changes
- escalation responses

### Must Not

- directly own implementation details
- bypass review records
- mutate code artifacts without task tracking

---

## 4.2 Product OS Docs

### Purpose

Hold the canonical project operating documents.

### Owns

- `00-project-brief.md`
- `04-domain-boundaries.md`
- `05-lifecycle-state-machine.md`
- `09-api-contract.md` later
- `10-invariants.md` later
- `11-ai-agent-instructions.md` later
- `12-ai-collaboration-protocol.md` later
- ADRs and major decisions

### Inputs

- founder intent
- architecture outputs
- repeated review findings
- approved decisions

### Outputs

- updated rules
- clarified constraints
- implementation guidance
- referenceable truth hierarchy

### Must Not

- hold temporary chat noise
- duplicate runtime logs
- become a dumping ground for every artifact

---

## 4.3 Task Orchestration

### Purpose

Manage work decomposition, assignment, sequencing, and handoff between agent roles.

### Owns

- task creation
- task states
- dependencies
- assignment to roles
- handoff records
- retry routing
- escalation status

### Inputs

- approved docs
- founder requests
- review outcomes
- failed run results

### Outputs

- assigned task
- next-step routing
- rework tasks
- blocked status
- escalation requests

### Must Not

- store canonical docs
- execute code directly
- perform review decisions itself

---

## 4.4 Agent Registry

### Purpose

Define which agents exist, what each role can do, and what each role cannot do.

### Owns

- agent role definitions
- allowed tools
- permission scopes
- skill attachments
- role-specific limits

### Inputs

- collaboration protocol
- agent instruction rules
- founder policy decisions

### Outputs

- executable role profile
- allowed action matrix
- task eligibility rules

### Must Not

- contain project-specific implementation artifacts
- override project documents
- approve work

---

## 4.5 Context Assembly

### Purpose

Construct a compact, relevant context pack for each task or run.

### Owns

- context snapshots
- selected docs
- selected artifacts
- retrieval filters
- compression summaries
- context provenance

### Inputs

- task definition
- project docs
- relevant artifacts
- reference examples

### Outputs

- context pack for run
- missing-context warning
- ambiguity flag

### Must Not

- rewrite canonical docs silently
- include unrelated repository areas by default
- decide task acceptance

---

## 4.6 Execution Runs

### Purpose

Execute agent work in isolated sessions.

### Owns

- run state
- run attempt history
- workspace/session binding
- execution logs
- runtime outputs
- timeout / retry metadata

### Inputs

- assigned task
- agent profile
- context pack
- tool permissions

### Outputs

- artifacts
- run logs
- completion status
- failure reason
- handoff recommendation

### Must Not

- self-approve critical work
- change project scope
- edit unrestricted domains outside task scope

---

## 4.7 Artifact Registry

### Purpose

Store and classify all meaningful outputs of work.

### Owns

- generated docs
- code patches
- database schemas
- API specs
- test reports
- review notes
- release summaries

### Artifact Types

- document artifact
- frontend artifact
- backend artifact
- schema artifact
- test artifact
- review artifact
- decision artifact

### Must Not

- route tasks
- define permissions
- infer final approval status by itself

---

## 4.8 Frontend Delivery

### Purpose

Own the UI implementation track and related artifacts.

### Owns

- screens
- components
- frontend flows
- UI states
- frontend tasks
- frontend review artifacts

### Inputs

- project brief
- user flows
- domain boundaries
- state definitions
- accepted frontend tasks

### Outputs

- screen specs
- component structures
- frontend code
- UX review requests

### Must Not

- define backend schema authority
- create hidden backend assumptions
- change API contracts without coordination

---

## 4.9 Backend Delivery

### Purpose

Own backend architecture and implementation flow.

### Owns

- service boundaries
- API implementation tasks
- database schema tasks
- migrations
- backend code artifacts
- integration contracts

### Inputs

- project docs
- accepted architecture tasks
- approved API contracts
- approved schema changes

### Outputs

- backend design
- schema artifacts
- migrations
- service code
- backend test targets

### Must Not

- redefine project goals
- bypass review for schema-impacting work
- mutate frontend state models without explicit coordination

---

## 4.10 Review & QA

### Purpose

Validate outputs and protect the system from low-quality or unsafe changes.

### Owns

- review decisions
- defect records
- test plans
- validation status
- rejection reasons
- rework recommendations

### Review Types

- documentation review
- architecture review
- code review
- schema review
- test review
- release review

### Outputs

- approved
- approved with notes
- rejected
- rework required
- blocked for founder decision

### Must Not

- silently edit implementation and mark it approved
- own business scope
- change canonical docs without task trace

---

## 4.11 GitHub Integration

### Purpose

Connect internal workflow to repository operations.

### Owns

- repo linkage
- branch linkage
- PR metadata
- commit references
- check status sync

### Inputs

- approved implementation artifacts
- run outputs
- review metadata

### Outputs

- branch updates
- PR references
- check results
- merge readiness status

### Must Not

- become source of truth for product intent
- approve release by itself
- replace internal review workflow

---

## 4.12 Observability & Audit

### Purpose

Keep the system inspectable, measurable, and recoverable.

### Owns

- event log
- audit trail
- run metrics
- failure traces
- task throughput metrics
- agent performance metrics

### Inputs

- task events
- run events
- review events
- approval events

### Outputs

- dashboards
- audit history
- failure analysis
- bottleneck visibility

### Must Not

- change task state directly without workflow authority
- act as execution controller

---

## 4.13 Reference Examples

### Purpose

Reduce ambiguity by storing approved examples of good outputs.

### Owns

- example PRs
- example specs
- example tests
- example migrations
- example review comments
- example run summaries

### Must Not

- override canonical rules
- become stale without versioning note

---

## 4.14 Voice Interface

### Purpose

Optional future interface for spoken interaction.

### Status

Out of scope for V1.

### Must Not

- hold canonical truth
- bypass founder approvals
- replace structured docs

---

## 5 — Allowed Cross-Domain Interactions

| From | To | Allowed Interaction |
|---|---|---|
| Founder Control Plane | Product OS Docs | create, approve, request update |
| Founder Control Plane | Task Orchestration | create task, reprioritize, escalate |
| Product OS Docs | Context Assembly | provide source documents |
| Task Orchestration | Agent Registry | resolve eligible role |
| Task Orchestration | Context Assembly | request scoped context pack |
| Task Orchestration | Execution Runs | create run request |
| Execution Runs | Artifact Registry | write outputs |
| Execution Runs | Observability & Audit | emit run events |
| Artifact Registry | Review & QA | submit artifact for validation |
| Review & QA | Task Orchestration | return approve/reject/rework |
| Backend Delivery | GitHub Integration | prepare code-linked outputs |
| Frontend Delivery | GitHub Integration | prepare code-linked outputs |
| GitHub Integration | Observability & Audit | emit sync events |
| Review & QA | Founder Control Plane | escalate material decision |
| Reference Examples | Context Assembly | provide canonical example context |

---

## 6 — Forbidden Cross-Domain Interactions

| From | To | Forbidden Action |
|---|---|---|
| Execution Runs | Product OS Docs | silent rewrite of canonical rules |
| Frontend Delivery | Backend Delivery | direct schema mutation |
| Backend Delivery | Frontend Delivery | direct UI requirement rewrite |
| Agent Registry | Founder Control Plane | autonomous approval |
| Artifact Registry | Task Orchestration | task state mutation without workflow record |
| GitHub Integration | Product OS Docs | replacing approved docs with repo guesses |
| Review & QA | GitHub Integration | merging critical changes without approval |
| Voice Interface | Any core domain | bypassing structured workflow |

---

## 7 — Ownership of Critical Decisions

| Decision Type | Owner | Reviewer | Final Approver |
|---|---|---|---|
| project scope | Founder | Product Strategist | Founder |
| domain structure | Solution Architect | Reviewer | Founder |
| task decomposition | Task Orchestration | Reviewer if needed | Founder for major changes |
| frontend design direction | Frontend Builder | Reviewer | Founder |
| backend architecture | Backend Architect | Reviewer | Founder |
| database schema changes | Backend Architect | Reviewer / QA | Founder |
| implementation quality | Implementer | Reviewer / QA | system review gate |
| release readiness | Release Coordinator | Reviewer / QA | Founder |

---

## 8 — Boundary Rules for Agents

### Agents may

- operate only inside assigned role scope
- produce artifacts relevant to current task
- request missing context
- escalate ambiguity
- return work for review

### Agents may not

- redefine project scope on their own
- expand task scope without trace
- alter unrelated repository areas
- self-certify critical backend or schema changes
- use chat history as higher priority than docs

---

## 9 — Boundary Rules for Repository Structure

Suggested high-level structure:

```text
/
├─ README.md
├─ AGENTS.md
├─ docs/
│  ├─ 00-project-brief.md
│  ├─ 04-domain-boundaries.md
│  ├─ 05-lifecycle-state-machine.md
│  ├─ 12-ai-collaboration-protocol.md
│  └─ adr/
├─ examples/
├─ frontend/
├─ backend/
├─ tests/
├─ scripts/
└─ audits/
```

Rules:

- product documents live in `docs/`
- approved examples live in `examples/`
- frontend code lives in `frontend/`
- backend code lives in `backend/`
- tests live in `tests/`
- automation and checks live in `scripts/`
- audit exports or logs live in `audits/` or external storage

---

## 10 — Boundary Failure Modes

Common failure patterns this document is meant to prevent:

- product rules hidden in chat instead of docs
- frontend task inventing backend structure
- backend task changing unrelated modules
- review agent acting like implementer
- task and run being treated as the same object
- all repository files being stuffed into context
- generated artifact being treated as approved truth
- founder losing visibility into current state

---

## 11 — Boundary Invariants

The following must always remain true:

- every task has one current owning domain
- every run belongs to one task
- every artifact has a source task or run
- every review verdict references an artifact
- canonical docs cannot be silently overridden by generated outputs
- backend schema changes require explicit schema ownership
- release approval cannot be inferred from implementation completion
- founder decisions must be traceable

---

## 12 — Open Questions

These will be resolved in later documents:

- exact task states
- exact run states
- exact review states
- schema for agent permissions
- structure of context pack
- artifact versioning rules
- approval flow for GitHub PR merge
- retry and rollback behavior

---

## 13 — Initial Decision

For V1, AI Workshop OS will operate as a single-founder internal system with:

- one founder control plane
- one canonical docs workspace
- one task orchestration layer
- separate frontend and backend delivery tracks
- separate review and QA authority
- GitHub integration as execution support, not as truth authority
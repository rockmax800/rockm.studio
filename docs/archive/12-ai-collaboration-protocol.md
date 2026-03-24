# 12 — AI Collaboration Protocol

## 1 — Purpose

This document defines how AI agents collaborate inside AI Workshop OS.

The goal is to ensure that:
- agents work through explicit handoffs
- outputs are inspectable
- review is formalized
- rework is controlled
- escalation happens early
- founder retains decision authority where needed

This protocol applies to all agent roles in V1.

---

## 2 — Core Principle

Agents do not collaborate through open-ended conversation.
Agents collaborate through:
- tasks
- context packs
- artifacts
- review verdicts
- handoff records
- approval gates

Conversation may support execution.
It does not replace protocol.

---

## 3 — Standard Collaboration Flow

The default flow is:

1. founder or system creates a task
2. task is assigned to one role
3. context pack is assembled
4. agent executes one run
5. agent produces one or more artifacts
6. artifacts are reviewed
7. reviewer either:
   - approves
   - approves with notes
   - rejects
   - escalates
8. task is either:
   - completed
   - handed off
   - returned for rework
   - escalated to founder

---

## 4 — Agent Roles in V1

| Role | Primary Responsibility | Typical Outputs |
|---|---|---|
| Product Strategist | shape idea into structured product definition | brief, scope, requirements |
| Solution Architect | define domains, states, system boundaries, architecture | architecture docs, domain maps, ADRs |
| Frontend Builder | create UI structure and frontend artifacts | screen specs, component structures, frontend code |
| Backend Architect | define backend decomposition and database logic | service map, schema plan, API structure |
| Backend Implementer | implement backend tasks | code, migrations, API handlers, integration code |
| Reviewer | validate work quality and correctness | review verdicts, issue lists, rework notes |
| QA Agent | design and run tests, identify defects | test plans, test cases, defect reports |
| Release Coordinator | package milestone outputs and readiness summary | release summary, readiness checklist |

A role may only act within its assigned scope.

---

## 5 — Handoff Entity (First-Class Domain Object)

Handoff is a first-class entity stored in the `handoffs` table.
Every role-to-role collaboration transition creates a traceable Handoff record.

### 5.1 Handoff Fields

| Field | Type | Description |
|---|---|---|
| id | uuid | Unique handoff identifier |
| project_id | FK | Linked project |
| task_id | FK | Linked task |
| source_role_id | FK | Role sending the work |
| target_role_id | FK | Role receiving the work |
| requested_outcome | enum | implementation, review, clarification, approval_prep, qa, release |
| context_pack_id | FK (nullable) | Linked context pack |
| source_artifact_ids_json | jsonb | Referenced artifact IDs |
| constraints_json | jsonb | Must / must not rules for this handoff |
| acceptance_criteria_json | jsonb | What counts as success (**required, non-empty**) |
| open_questions_json | jsonb | Unresolved items if any |
| urgency | enum | normal, high, blocker |
| status | enum | created, acknowledged, completed, cancelled |
| created_from_review_id | FK (nullable) | If handoff originated from a review rejection |
| created_at | timestamp | Creation time |
| acknowledged_at | timestamp | When target role acknowledged |
| closed_at | timestamp | When completed or cancelled |

### 5.2 Handoff Lifecycle

```
created → acknowledged → completed
created → cancelled
acknowledged → cancelled
```

### 5.3 Handoff Invariants (Enforced in Code)

1. **Every task owner change** creates a Handoff record via `TaskService.assignTask()`
2. **No run may start** without an acknowledged Handoff (`RunService.startRun()` validates)
3. **`task.current_handoff_id`** always points to the most recent active handoff
4. **Review rejection** automatically creates a rework Handoff (reviewer → implementer)
5. **Source and target roles must differ** — no self-handoff
6. **Both roles must be active** at handoff creation time
7. **Acceptance criteria are mandatory** — at least one criterion required

### 5.4 Handoff Audit Trail

All Handoff status changes emit `ActivityEvent`:
- `handoff.created` — when handoff is created
- `handoff.acknowledged` — when target role accepts
- `handoff.completed` — when work is finished
- `handoff.cancelled` — when handoff is cancelled

### 5.5 Handoff Rule
No role may hand off work without:
- a target role
- a clear requested outcome
- at least one explicit acceptance criterion

---

## 6 — Minimum Task Packet

Before any agent starts work, the task packet must contain:

- task title
- task purpose
- owner role
- project reference
- expected output type
- acceptance criteria
- domain placement
- relevant constraints
- context pack or missing-context flag

If this minimum is missing, the agent must not begin execution.
The agent must return `needs_clarification`.

---

## 7 — Context Pack Rules

## 7.1 Context Pack Purpose
A context pack provides only the information needed for the current task.

## 7.2 Context Pack May Include
- relevant project brief sections
- domain boundaries
- lifecycle rules
- target artifact references
- reference examples
- prior review notes
- related code or file paths
- relevant decisions

## 7.3 Context Pack Must Not Include
- unrelated repository areas
- full chat transcripts by default
- stale conflicting drafts without labels
- unbounded historical material

## 7.4 Missing Context Rule
If context is insufficient, the receiving role must:
1. stop execution
2. mark the issue clearly
3. request clarification or additional context

Agents must not silently guess through major ambiguity.

---

## 8 — Standard Output Contract

Every agent task result must use the same output contract.

## 8.1 Required Output Fields

| Field | Description |
|---|---|
| summary | what was done |
| status | completed, partial, blocked, escalated |
| produced_artifacts | what was created or updated |
| assumptions | assumptions made during work |
| unresolved_risks | risks or unknowns |
| verification | what was checked |
| recommended_next_role | who should receive it next |
| recommended_next_action | what should happen next |

## 8.2 Output Rule
An output is invalid if it contains only narrative explanation without explicit deliverables.

---

## 9 — Review Protocol

## 9.1 What Can Be Reviewed
- document artifact
- architecture artifact
- frontend artifact
- backend artifact
- schema artifact
- test artifact
- release artifact

## 9.2 Review Inputs
Reviewer must receive:
- artifact reference
- originating task
- acceptance criteria
- relevant constraints
- context pack
- any prior rejection notes

## 9.3 Review Verdicts
Reviewer must produce one of four verdicts:
- approved
- approved_with_notes
- rejected
- escalated

## 9.4 Review Output Contract
Every review must include:
- verdict
- blocking issues
- non-blocking notes
- reason
- suggested next step

## 9.5 Review Rule
The reviewer must not silently fix the artifact and mark it approved in the same review cycle.

If the reviewer changes implementation, that is new implementation work and must be tracked separately.

---

## 10 — Rework Protocol

## 10.1 When Rework Is Required
Rework is required when:
- review verdict is `rejected`
- output does not match acceptance criteria
- domain boundaries were violated
- verification is missing
- required artifact format is absent

## 10.2 Rework Packet
The role receiving rework must receive:
- rejection reason
- blocking issues
- exact artifact references
- unchanged acceptance criteria or updated criteria
- recommended correction scope

## 10.3 Rework Rule
Rework must be scoped.
Do not reopen the entire problem if only one bounded correction is needed.

---

## 11 — Escalation Protocol

## 11.1 Escalate To Founder When
- scope is materially ambiguous
- architecture tradeoff affects multiple domains
- schema change is significant
- security risk is unclear
- review conflict cannot be resolved
- task conflicts with existing canonical docs
- release readiness is uncertain

## 11.2 Escalation Packet
Every escalation must include:
- issue summary
- why agent cannot proceed safely
- options considered
- recommended decision
- consequence of delay
- consequence of wrong decision

## 11.3 Escalation Rule
Escalation must happen before unsafe implementation, not after.

---

## 12 — Role-to-Role Handoff Matrix

| From | To | Typical Reason |
|---|---|---|
| Product Strategist | Solution Architect | structured product intent ready for system design |
| Solution Architect | Frontend Builder | UI-facing structure and flows defined |
| Solution Architect | Backend Architect | backend boundaries and responsibilities defined |
| Backend Architect | Backend Implementer | implementation-ready backend task packet exists |
| Frontend Builder | Reviewer | frontend artifact needs validation |
| Backend Implementer | Reviewer | backend artifact needs validation |
| Reviewer | Backend Implementer | rework required |
| Reviewer | Frontend Builder | rework required |
| Reviewer | Founder | escalation or major decision needed |
| QA Agent | Backend Implementer | defect requires correction |
| QA Agent | Reviewer | test findings need formal validation |
| Reviewer | Release Coordinator | approved milestone artifact ready |
| Release Coordinator | Founder | release candidate or milestone ready for approval |

No other handoffs are allowed unless explicitly introduced later.

---

## 13 — Allowed Collaboration Patterns

## 13.1 Sequential pattern
One role finishes work, next role picks it up.

Use for:
- architecture
- implementation
- review
- release prep

## 13.2 Review loop
Implementer produces output, reviewer checks it, work returns if needed.

Use for:
- code
- schemas
- docs

## 13.3 Clarification loop
Role pauses and requests missing information.

Use for:
- unclear scope
- missing acceptance criteria
- conflicting docs

## 13.4 Escalation gate
Work pauses until founder decides.

Use for:
- major architecture
- major scope
- release safety
- schema authority

---

## 14 — Forbidden Collaboration Patterns

Agents must not:
- self-assign arbitrary high-impact tasks
- review and approve their own critical backend changes
- expand task scope without recording it
- bypass founder gate on major decisions
- pass vague work like "please improve this"
- hand off work without acceptance criteria
- treat chat memory as canonical truth
- silently override approved docs

---

## 15 — Definition of Done by Task Type

## 15.1 Documentation task
Done only if:
- requested document exists
- structure is complete enough to use
- constraints are explicit
- next dependency is clear

## 15.2 Frontend task
Done only if:
- UI artifact exists
- required states are covered
- acceptance criteria are mapped
- review outcome is resolved

## 15.3 Backend architecture task
Done only if:
- system boundaries are explicit
- services or modules are defined
- data implications are stated
- implementation handoff is possible

## 15.4 Backend implementation task
Done only if:
- code artifact exists
- required checks were run if available
- no unresolved blocking issue remains
- review has been completed or requested

## 15.5 Review task
Done only if:
- verdict is explicit
- reasons are explicit
- blocking vs non-blocking is explicit
- next step is explicit

## 15.6 QA task
Done only if:
- test plan or test result exists
- defects are traceable
- affected artifacts are linked
- severity is clear

---

## 16 — Founder Approval Gates

Founder approval is mandatory for:
- project activation
- major scope change
- major architecture decision
- database schema decision with system-wide impact
- release candidate acceptance
- cancellation of important in-progress work

Agents may recommend approval.
Agents may not simulate approval.

---

## 17 — Work Packaging Rules

## 17.1 Prefer small packages
Tasks should be small enough to:
- have clear acceptance criteria
- produce one primary output
- be reviewed in one pass

## 17.2 Avoid mega-tasks
Do not create broad task packets like:
- build the backend
- improve architecture
- fix the product

These are invalid task shapes.

## 17.3 Preferred task shape
A good task packet looks like:
- define account and project tables
- implement project creation API
- review migration for task-run linkage
- write QA checklist for approval workflow

---

## 18 — Traceability Rules

Every collaboration step must remain traceable.

The system must preserve links between:
- project
- task
- run
- context pack
- artifact
- review
- approval
- next handoff

If traceability is broken, the work is operationally unsafe.

---

## 19 — Protocol Failure Modes

This protocol is designed to prevent:

1. agents talking a lot but producing no artifacts
2. tasks bouncing with no clear owner
3. reviewer acting as hidden implementer
4. ambiguous "done" state
5. backend work starting without architecture
6. schema changes being smuggled through implementation
7. founder losing visibility into why work is blocked
8. repeated mistakes not becoming explicit rules

---

## 20 — Protocol Invariants

The following must always hold:

1. every active task has one current owner role
2. every handoff has a sender and receiver
3. every handoff states the requested outcome
4. every review has a verdict
5. every rejection includes blocking reasons
6. every escalation includes a decision request
7. every major decision remains founder-visible
8. no critical work becomes done without explicit validation path

---

## 21 — Initial V1 Collaboration Pattern

The default V1 execution pattern is:

1. founder defines idea
2. Product Strategist creates structured brief
3. Solution Architect defines boundaries and states
4. Frontend Builder works on UI track
5. Backend Architect prepares backend track
6. Backend Implementer executes bounded backend tasks
7. Reviewer validates outputs
8. QA Agent tests important flows
9. Release Coordinator packages milestone
10. founder approves next major step
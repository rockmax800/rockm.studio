# 13 — Lovable UI Spec V1

## 1 — Purpose

This document defines the first UI version of AI Workshop OS.

The UI is not a generic dashboard.

It is the founder control plane for managing projects, tasks, agent work, reviews, approvals, and documentation.

The interface must allow a solo founder to:

- create and structure projects
- inspect delivery state without reading code deeply
- trigger and monitor agent workflows
- review artifacts
- approve or reject major decisions
- understand where work is blocked

---

## 2 — Primary User

Single user in V1:

- founder
- CEO
- product lead
- final approver

This user is strong in product thinking and weak in backend implementation details.

The UI must optimize for:

- clarity
- control
- traceability
- low cognitive load
- operational visibility

---

## 3 — UI Design Principles

### 3.1 Founder-first, not engineer-first

The UI must explain what is happening in delivery terms, not only in infrastructure terms.

### 3.2 Status must be visible

Every important object must expose:

- current state
- current owner
- next step
- blocker if any

### 3.3 Documents are first-class

Project docs are part of the operating system, not a side panel.

### 3.4 Work must be inspectable by object

The founder must be able to open:

- a project
- a task
- a run
- an artifact
- a review
- an approval

and understand the story quickly.

### 3.5 Actions must be constrained

The UI should guide through clear actions:

- create project
- approve
- reject
- request rework
- assign
- escalate
- archive

Avoid vague actions like "optimize" or "improve".

---

## 4 — Core Navigation

Primary navigation:

- Dashboard
- Projects
- Tasks
- Runs
- Artifacts
- Reviews
- Approvals
- Agents
- Docs Workspace
- Settings

Optional later:

- Metrics
- GitHub
- Voice

---

## 5 — Global Layout

## 5.1 App Shell

- left sidebar navigation
- top bar with:
  - current project selector
  - global search
  - notification center
  - founder quick actions
- main content area
- right-side contextual inspector panel on detail views

## 5.2 Global Search

Search across:

- projects
- tasks
- artifacts
- docs
- reviews
- approvals

## 5.3 Global Status Strip

Persistent top-level indicators:

- active project count
- blocked task count
- pending approvals
- failed runs
- items needing founder decision

---

## 6 — Dashboard Screen

## 6.1 Purpose

The founder home screen.

Shows what matters now.

## 6.2 Main Sections

### A. Current Priorities

Cards:

- tasks blocked
- approvals waiting
- reviews rejected
- runs failed
- release candidates waiting

### B. Active Projects Snapshot

For each project show:

- project name
- state
- progress summary
- open tasks
- blocked tasks
- pending approvals
- last activity

### C. Founder Decision Queue

List of:

- architecture approvals
- schema approvals
- release approvals
- escalations

### D. Delivery Activity Feed

Recent events:

- task assigned
- run started
- artifact created
- review rejected
- approval granted

### E. Agent Activity Summary

For each active role:

- current task
- current run status
- queue length
- last output

## 6.3 Main Actions

- create new project
- open pending approval
- inspect blocked task
- resume paused project

---

## 7 — Projects Screen

## 7.1 Purpose

Project portfolio and project creation.

## 7.2 List View Columns

- project name
- state
- current phase
- owner
- active tasks
- blocked tasks
- pending approvals
- updated at

## 7.3 Filters

- draft
- scoped
- active
- blocked
- paused
- completed
- archived

## 7.4 Project Creation Form

Fields:

- project name
- short purpose
- project type
- initial goal
- version scope
- notes

## 7.5 Project Detail Tabs

- Overview
- Docs
- Tasks
- Runs
- Artifacts
- Reviews
- Approvals
- Activity

## 7.6 Project Overview Blocks

- project summary
- current state
- current milestone
- project risks
- next founder decisions
- progress by domain
- recent artifacts

---

## 8 — Docs Workspace Screen

## 8.1 Purpose

Canonical project documentation center.

## 8.2 List of Core Docs

- 00-project-brief.md
- 04-domain-boundaries.md
- 05-lifecycle-state-machine.md
- 11-ai-agent-instructions.md later
- 12-ai-collaboration-protocol.md
- 13-lovable-ui-spec-v1.md

## 8.3 View Modes

- document list
- split view: file tree + editor/preview
- compare versions
- document metadata

## 8.4 Document Metadata

- document name
- status
- version
- updated by
- last updated at
- linked tasks
- linked decisions

## 8.5 Main Actions

- create document
- edit document
- mark canonical
- link to task
- link to approval
- compare versions

## 8.6 Important Rule

Docs must feel operational, not like a wiki.

---

## 9 — Tasks Screen

## 9.1 Purpose

Task control center.

## 9.2 List View Columns

- task title
- project
- domain
- owner role
- state
- priority
- expected artifact
- blocked flag
- updated at

## 9.3 Filters

- by state
- by role
- by project
- by domain
- by blocked
- by escalated
- by awaiting review

## 9.4 Task Detail Sections

- task summary
- acceptance criteria
- constraints
- current owner role
- linked context pack
- linked runs
- linked artifacts
- linked reviews
- linked approvals
- handoff history

## 9.5 Main Actions

- create task
- assign role
- mark ready
- request clarification
- escalate
- cancel
- link artifact
- open review

## 9.6 Create Task Form

Fields:

- title
- purpose
- project
- domain
- owner role
- expected output type
- acceptance criteria
- constraints
- urgency
- notes

---

## 10 — Runs Screen

## 10.1 Purpose

Execution monitoring layer.

## 10.2 List View Columns

- run id
- task
- project
- agent role
- state
- started at
- ended at
- duration
- outcome

## 10.3 Filters

- created
- preparing
- running
- produced_output
- failed
- timed_out
- cancelled
- finalized

## 10.4 Run Detail Sections

- run summary
- parent task
- role used
- context pack reference
- execution log
- output summary
- linked artifacts
- failure reason
- retry history

## 10.5 Main Actions

- inspect logs
- retry run
- mark superseded
- link to review
- open parent task

## 10.6 Founder Benefit

The founder should understand:

- what was attempted
- whether it worked
- what came out
- why it failed if it failed

---

## 11 — Artifacts Screen

## 11.1 Purpose

Output library across docs, code, test plans, schemas, and reports.

## 11.2 List View Columns

- artifact name
- artifact type
- project
- source task
- source run
- state
- reviewer status
- updated at

## 11.3 Artifact Types

- document
- architecture
- frontend
- backend
- schema
- test
- review
- release

## 11.4 Artifact Detail Sections

- artifact preview
- metadata
- source references
- review history
- current state
- canonical flag
- linked decisions

## 11.5 Main Actions

- submit for review
- mark superseded
- freeze as canonical
- archive
- link reference example

---

## 12 — Reviews Screen

## 12.1 Purpose

Formal validation center.

## 12.2 List View Columns

- review id
- target artifact
- project
- reviewer role
- verdict
- blocking issues count
- created at
- closed at

## 12.3 Filters

- created
- in_progress
- needs_clarification
- approved
- approved_with_notes
- rejected
- escalated
- closed

## 12.4 Review Detail Sections

- target artifact
- acceptance criteria
- verdict
- blocking issues
- non-blocking notes
- required rework
- linked follow-up tasks

## 12.5 Main Actions

- approve
- approve with notes
- reject
- escalate
- create rework task

---

## 13 — Approvals Screen

## 13.1 Purpose

Founder decision center.

## 13.2 List View Columns

- approval id
- project
- decision type
- requested by
- target object
- state
- urgency
- created at

## 13.3 Approval Types

- project activation
- architecture approval
- schema approval
- scope change approval
- release approval
- cancellation approval

## 13.4 Approval Detail Sections

- request summary
- options considered
- recommendation
- consequences
- linked docs
- linked artifacts
- linked reviews

## 13.5 Main Actions

- approve
- reject
- defer
- request more information

This screen is one of the most important in the whole product.

---

## 14 — Agents Screen

## 14.1 Purpose

Agent registry and activity view.

## 14.2 List View Columns

- role name
- status
- current task
- active runs
- allowed domains
- capabilities
- restrictions

## 14.3 Agent Detail Sections

- role description
- allowed actions
- forbidden actions
- skill list
- current workload
- recent outputs
- review outcomes

## 14.4 Main Actions

- activate role
- deactivate role
- edit role profile
- inspect role history
- attach skill later

## 14.5 Important Rule

This is not a chat roster.

This is an operating roster.

---

## 15 — Activity Timeline

## 15.1 Purpose

Cross-object traceability.

## 15.2 Event Types

- project created
- doc updated
- task created
- task assigned
- run started
- run failed
- artifact created
- review submitted
- review rejected
- approval requested
- approval decided

## 15.3 Use

Available:

- globally on Dashboard
- inside each project
- inside object detail pages

---

## 16 — Suggested Object Detail Pattern

All major object pages should follow the same structure:

### Header

- title
- state badge
- owner
- project
- last updated
- quick actions

### Summary Panel

- purpose
- current issue
- next step

### Linked Objects Panel

- related tasks
- runs
- artifacts
- reviews
- approvals
- docs

### Timeline Panel

- lifecycle history

This consistency is important.

It lowers founder cognitive load.

---

## 17 — V1 Data Objects Visible in UI

The UI must visibly support:

- Project
- Task
- Run
- Artifact
- Review
- Approval
- Agent Role
- Document

These are the visible backbone of the system.

---

## 18 — Primary Founder Journeys

## 18.1 Start New Project

1. open Projects
2. create project
3. fill brief starter fields
4. open Docs Workspace
5. generate or edit project brief
6. mark project scoped

## 18.2 Approve Architecture

1. open Dashboard or Approvals
2. inspect architecture request
3. inspect linked docs and artifacts
4. approve or reject
5. trigger next task stage

## 18.3 Inspect Blocked Work

1. open Dashboard blocked items
2. open task
3. inspect blocker reason
4. inspect linked run or review
5. decide reassign, escalate, or cancel

## 18.4 Review Delivery Progress

1. open project overview
2. inspect task counts by state
3. inspect latest artifacts
4. inspect pending approvals
5. inspect release readiness

---

## 19 — V1 UI Components

Suggested reusable components:

- status badge
- priority badge
- domain badge
- owner role badge
- timeline list
- artifact card
- review verdict chip
- approval decision card
- blocker banner
- linked object table
- side inspector drawer

---

## 20 — Visual Status System

Use a consistent state color system:

- draft / created: neutral
- ready / scoped: blue
- active / running / in_progress: cyan or blue
- waiting_review / in_review: amber
- approved / accepted / done / completed: green
- blocked / rejected / failed / escalated: red
- paused / deferred: gray or muted amber
- archived / cancelled / superseded: muted gray

Consistency matters more than style.

---

## 21 — Empty States

Every empty state must teach next action.

Examples:

### No projects

"Create your first project to start structuring your internal AI delivery workflow."

### No tasks

"No tasks yet. Create a task from a project or docs workspace."

### No pending approvals

"No founder decisions waiting. Delivery is moving without blocked approval gates."

### No runs

"No execution runs yet. Assign a task and start the first run."

---

## 22 — V1 Non-Goals

Do not include in first UI version:

- voice interface
- multi-user collaboration
- advanced analytics
- autonomous deploy center
- model selection marketplace
- long-term memory graph visualizer
- billing and monetization

---

## 23 — V1 Build Priority for Lovable

Build in this order:

### Phase 1

- app shell
- dashboard
- projects list
- project detail
- docs workspace

### Phase 2

- tasks list
- task detail
- approvals list
- approval detail

### Phase 3

- runs list
- run detail
- artifacts list
- artifact detail
- reviews list

### Phase 4

- agents screen
- activity timeline
- polish and linking

---

## 24 — Acceptance Criteria for UI V1

The UI is ready for V1 if:

- founder can create a project
- founder can navigate all core objects
- founder can inspect task, run, artifact, review, and approval states
- founder can manage docs as first-class objects
- founder can see blocked work and pending decisions immediately
- object relationships are visible
- no critical founder workflow requires reading raw logs first

---

## 25 — Final UI Principle

This interface is not a coding dashboard.

It is a delivery control plane for a solo founder running an AI-powered software workshop.
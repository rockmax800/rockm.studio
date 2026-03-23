# 15 — Backend Architecture V1

## 1 — Purpose

This document defines the V1 backend architecture for AI Workshop OS.

The backend exists to support:

- founder control

- project documentation management

- task orchestration

- isolated run tracking

- artifact storage

- review workflows

- founder approval gates

- audit visibility

This backend is not a public SaaS platform.

It is an internal control and execution support system for one founder.

---

## 2 — V1 Backend Objective

The backend must make the following possible:

1. create and manage projects

2. store canonical docs

3. create and route tasks

4. assemble scoped context for work

5. create and monitor execution runs

6. store produced artifacts

7. run review and rework loops

8. request and record founder approvals

9. show timeline and current status clearly

10. integrate later with GitHub and execution tools

The backend is the system of record.

The UI is only a control surface.

---

## 3 — Architecture Philosophy

### 3.1 Monolith first

V1 should be a modular monolith.

Do not start with microservices.

Reason:

- one founder

- one internal product

- limited backend complexity

- high need for speed and clarity

- easier debugging

- easier local development

### 3.2 Workflow-centric, not CRUD-centric

The backend is not just a database wrapper.

It must enforce lifecycle transitions and collaboration rules.

### 3.3 State transitions are first-class

Every meaningful status change must happen through backend rules, not arbitrary frontend mutation.

### 3.4 Events matter

Important actions should emit activity events for auditability and timeline rendering.

### 3.5 Human approval remains a hard gate

Backend must not auto-resolve major decisions without founder action.

---

## 4 — Recommended Tech Stack

## 4.1 Recommended V1 Stack

- frontend: Lovable-generated frontend

- backend: Next.js server actions / route handlers or NestJS

- database: PostgreSQL

- ORM: Prisma

- validation: Zod

- background jobs: simple DB-backed queue first, later Redis if needed

- file storage: local filesystem first or object storage later

- auth: single founder auth later, can start with protected local/internal mode

- deployment: one VPS / one server / Docker Compose

## 4.2 Best Choice For You

For your case, I recommend:

- Next.js app for frontend shell

- separate backend logic inside the same codebase at first

- PostgreSQL

- Prisma

- Zod

- simple internal API layer

- background worker process for runs and async actions

Why:

- fewer moving parts

- easier for Cursor to scaffold

- easier to keep frontend and backend connected

- enough power for V1

If later it becomes too crowded, extract backend modules. Not now.

---

## 5 — System Context

V1 system context:

- founder interacts with UI

- UI calls backend API / server layer

- backend writes to PostgreSQL

- backend triggers orchestration actions

- worker executes async tasks or external agent calls

- artifacts and logs are stored

- review and approval loops return to founder UI

Core rule:

the backend owns business workflow.

The frontend only reflects and triggers allowed actions.

---

## 6 — Backend Modules

V1 backend should be organized into modules, not services.

Recommended modules:

- Projects Module

- Documents Module

- Tasks Module

- Context Module

- Runs Module

- Artifacts Module

- Reviews Module

- Approvals Module

- Agent Roles Module

- Activity Module

- Orchestration Module

- GitHub Integration Module later

---

## 7 — Module Responsibilities

## 7.1 Projects Module

Owns:

- project creation

- project update

- project state transitions

- project summary queries

Must enforce:

- valid project lifecycle transitions

- minimum docs before activation

---

## 7.2 Documents Module

Owns:

- create/update documents

- document version metadata

- canonical status

- project doc retrieval

Must enforce:

- canonical docs are not silently overwritten

- document links stay traceable to task/artifact if relevant

---

## 7.3 Tasks Module

Owns:

- task creation

- task assignment

- task state transitions

- task dependency metadata

- task summary queries

Must enforce:

- required fields before ready/assigned/in_progress

- valid transitions

- one current owner role at a time

This is one of the most important modules.

---

## 7.4 Context Module

Owns:

- context pack creation

- selecting relevant docs and artifacts

- storing assumptions

- marking missing context

Must enforce:

- context packs are scoped

- irrelevant context is not passed by default

---

## 7.5 Runs Module

Owns:

- run creation

- run lifecycle updates

- run summaries

- retry tracking

- linking outputs to runs

Must enforce:

- each run belongs to one task

- run numbers are sequential per task

- terminal run states are explicit

---

## 7.6 Artifacts Module

Owns:

- artifact creation

- artifact classification

- artifact state transitions

- storage references

- canonical flagging

Must enforce:

- artifact source exists

- accepted and frozen states follow review/approval rules

---

## 7.7 Reviews Module

Owns:

- review creation

- review state management

- verdict storage

- rework initiation

Must enforce:

- every review has target artifact

- verdicts are explicit

- review closure is recorded

---

## 7.8 Approvals Module

Owns:

- founder approval requests

- approval state transitions

- decision notes

- approval dashboards

Must enforce:

- major decisions require explicit founder action

- target object references are valid

---

## 7.9 Agent Roles Module

Owns:

- agent role records

- allowed and forbidden action metadata

- role lookup for task assignment

Must enforce:

- only active roles can receive work

---

## 7.10 Activity Module

Owns:

- activity event creation

- event queries

- project timeline

- dashboard feed

Must enforce:

- important actions emit events

---

## 7.11 Orchestration Module

Owns:

- high-level workflow actions

- "assign task and create run"

- "submit artifact for review"

- "reject review and reopen task"

- "request founder approval"

This is the workflow brain.

It should call other modules.

It should not replace them.

---

## 8 — Application Layers

Use a layered backend.

Recommended layers:

### 8.1 API Layer

Receives requests from UI.

Validates input.

Calls application services.

### 8.2 Application Layer

Implements workflow use cases.

Coordinates modules.

Applies collaboration rules.

### 8.3 Domain Rules Layer

Contains lifecycle guards and invariant checks.

### 8.4 Persistence Layer

Prisma models, repositories, DB queries.

### 8.5 Worker Layer

Handles async run execution, retries, and external integrations.

This layering matters.

Do not dump all logic into route handlers.

---

## 9 — Recommended Folder Structure

Example structure:

```text
src/
  app/
    api/
  modules/
    projects/
      project.service.ts
      project.repository.ts
      project.types.ts
      project.validators.ts
    documents/
    tasks/
    context/
    runs/
    artifacts/
    reviews/
    approvals/
    agent-roles/
    activity/
    orchestration/
  lib/
    db/
    events/
    guards/
    utils/
  workers/
  prisma/
```

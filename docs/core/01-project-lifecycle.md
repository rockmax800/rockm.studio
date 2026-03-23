---
layer: core
criticality: critical
enabled_in_production: yes
---

# 01 — Project Lifecycle

> Layer 1 — Core Engine

## 1 — Purpose

Defines the project entity lifecycle: creation, scoping, activation, execution, review, completion, and archival.

---

## 2 — Project States

| State | Meaning |
|-------|---------|
| draft | Project idea exists but is not ready for execution |
| scoped | Project brief and initial scope are defined |
| active | Project is open for task creation and delivery work |
| blocked | Project cannot move due to unresolved issue |
| in_review | Major milestone or release candidate is under founder review |
| paused | Project is intentionally stopped |
| completed | Project goals for current version are met |
| archived | Project is frozen and no further work is expected |

---

## 3 — Allowed Transitions

| From | To | Trigger | Guard |
|------|----|---------|-------|
| draft | scoped | Brief accepted | Minimum project brief exists |
| scoped | active | Founder starts execution | Required docs exist; founder approval exists |
| active | blocked | Blocker raised | Blocker reason recorded |
| blocked | active | Blocker resolved | Blocking issue cleared |
| active | in_review | Release candidate submitted | Milestone artifacts exist |
| in_review | active | Founder requests more work | Rework decision recorded |
| in_review | completed | Founder approves | Acceptance criteria met; all tasks terminal |
| active | paused | Founder pauses work | Founder decision |
| paused | active | Founder resumes work | Founder decision |
| completed | archived | Founder archives | Founder decision |
| paused | archived | Founder archives | Founder decision |

For guard details, see `05-guard-matrix.md`.

---

## 4 — Terminal States

- `archived`

---

## 5 — Required Documents Before Activation

Before `scoped → active`:
- `00-project-brief.md`
- `02-domain-boundaries.md`
- `03-state-machine.md`

---

## 6 — Project Fields

See `04-data-model.md` §3 for complete field definitions.

---

## 7 — Relationships

- Project 1:N Task
- Project 1:N Document
- Project 1:N Run (through Tasks)
- Project 1:N Artifact
- Project 1:N Review
- Project 1:N Approval
- Project 1:N ActivityEvent

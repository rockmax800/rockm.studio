---
layer: core
criticality: critical
enabled_in_production: yes
doc_kind: contract
load_strategy: auto
---

# 02 — Domain Boundaries

> Layer 1 — Core Engine

## 1 — Purpose

Defines the core domains, their responsibilities, ownership boundaries, allowed interactions, and isolation rules.

---

## 2 — Domain Map

| Domain | Purpose | Owns | Does Not Own |
|--------|---------|------|-------------|
| Founder Control Plane | Founder-facing control layer | Projects, approvals, visibility | Code execution |
| Product OS Docs | Canonical project documentation | Briefs, domain docs, state docs | Runtime execution |
| Task Orchestration | Task lifecycle and handoffs | Tasks, assignments, queues | Code artifacts |
| Agent Registry | Agent role definitions | Profiles, permissions, skills | Project decisions |
| Context Assembly | Task-ready context packs | Context packs, snapshots | Source-of-truth docs |
| Execution Runs | Isolated agent execution | Runs, logs, retries | Project strategy |
| Artifact Registry | Output storage and classification | Docs, specs, diffs, schemas | Task routing |
| Frontend Delivery | UI implementation track | Screens, components, frontend tasks | Backend architecture |
| Backend Delivery | Backend implementation track | Services, APIs, migrations | Product strategy |
| Review & QA | Output validation | Review decisions, defects, test plans | Implementation ownership |
| GitHub Integration | Repository sync | Branches, PRs, commits | Product decisions |
| Observability & Audit | System inspectability | Event log, audit trail, metrics | Business rules |

---

## 3 — Boundary Principles

1. **Canonical truth lives in documents**, not in chat history
2. **Tasks are not Runs** — a Task is a unit of work; a Run is one execution attempt
3. **Reviews are independent from implementation** — implementer ≠ final reviewer
4. **Context is assembled, not dumped** — agents receive scoped context packs
5. **Artifacts are outputs, not truth by default** — they need review or approval
6. **Approval authority remains with founder** — scope changes, architecture, schema, releases

---

## 4 — Cross-Domain Interaction Rules

- Domains interact only through formal Task and Artifact objects
- No direct database access across domain boundaries
- State changes go through OrchestrationService
- Events provide async notification across domains

---
doc_kind: contract
load_strategy: auto
layer: cross-cutting
criticality: critical
---

# 00 — Project Brief

## 1 — Project Name
AI Workshop OS

## 2 — Purpose
Create a private dashboard-based workspace where a solo founder can work with specialized AI agents to design, build, review, and prepare software projects for production without relying on a traditional engineering team.

## 3 — Problem
The founder can define product ideas and evaluate value, but backend architecture, database design, QA, code review, and engineering throughput are bottlenecks.
Waiting for engineering teams slows execution and creates frustration.

## 4 — Target User
Internal only.
Single primary user: the founder acting as CEO, Product Lead, and final approver.

## 5 — Core Value
Turn product intent into implementation-ready work through structured documentation, agent orchestration, review loops, and approval gates.

## 6 — What the system should enable
- discuss and shape product ideas
- convert ideas into structured product documents
- generate and refine frontend using Lovable
- define backend architecture and database structure
- orchestrate multiple agent roles
- pass tasks from one agent to another
- review, reject, and request rework
- track all artifacts in one dashboard
- integrate with GitHub for code execution workflows

## 7 — Primary agent roles
- Product Strategist
- Solution Architect
- Frontend Builder
- Backend Architect
- Backend Implementer
- Reviewer
- QA Agent
- Release Coordinator

## 8 — Founder responsibilities
- define project goals
- approve scope
- approve architecture decisions
- approve major database changes
- approve release candidates

## 9 — Main constraints
- internal product only
- founder has limited backend expertise
- the system must reduce ambiguity
- the system must be understandable through one dashboard
- all agent work must be inspectable and recoverable

## 10 — Success criteria
- one founder can run software delivery through the system
- every project has structured docs before implementation
- frontend and backend work are visible as separate tracks
- tasks can move through review and rework cycles
- the founder can understand current state without reading code deeply

## 11 — Version 1 scope
Include:
- project creation
- docs workspace
- agent role system
- task creation and assignment
- review / reject / approve flow
- artifact tracking
- frontend workflow
- backend planning workflow

Exclude for now:
- voice interface
- autonomous deployment to production
- external multi-user collaboration
- billing and monetization
- advanced memory learning loops

## 12 — Key question for architecture
How to create a reliable internal agent workflow where backend design, implementation, review, and QA can happen through explicit handoffs instead of informal chat?

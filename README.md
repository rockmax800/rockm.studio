# AI Workshop OS

Internal agent-first development workspace for turning product ideas into production-ready software.

## Purpose
AI Workshop OS is a private development environment for a solo product founder.
It is designed to reduce dependency on external engineering teams by orchestrating AI agents across product planning, frontend delivery, backend implementation, review, testing, and release preparation.

## What this system does
- transforms product ideas into structured project documentation
- manages AI agents as specialized roles
- coordinates task handoffs between agents
- stores project context, decisions, artifacts, and reviews
- supports frontend generation workflows
- prepares backend architecture, database design, implementation tasks, and QA loops
- gives the founder a single dashboard for control and approval

## Core principle
The founder does not manually supervise coding step by step.
The founder defines goals, constraints, and approval gates.
Agents execute work inside explicit boundaries.

## Main user
A solo founder / product operator who is strong in product thinking and weak in backend engineering execution.

## Primary outcomes
- faster idea-to-build cycle
- less waiting on engineering teams
- structured documentation before code
- repeatable execution workflow
- visible quality gates before release

## System philosophy
- documentation is an execution interface
- agents work through tasks, artifacts, and reviews
- every important change must have an owner, status, and acceptance criteria
- frontend, backend, testing, and review are separate responsibilities
- ambiguity must be reduced through explicit rules and examples

## Initial scope
Version 1 is for internal use only.
No external customers, no multi-tenant SaaS requirements, no billing complexity.

## Main components
- CEO Cockpit
- Product OS Docs Workspace
- Agent Task Orchestrator
- Frontend Delivery Flow
- Backend Delivery Flow
- Review and QA Flow
- Artifact and Decision Log

## Documentation structure
- `README.md` — project overview for humans
- `AGENTS.md` — execution policy for agents
- `docs/00-project-brief.md` — project intent and scope
- `docs/04-domain-boundaries.md` — domain map and separation rules
- `docs/05-lifecycle-state-machine.md` — entity states and transitions
- `docs/12-ai-collaboration-protocol.md` — handoff, review, and escalation rules

## Non-goals for V1
- full autonomy without approval gates
- voice-first interaction
- production deployment without review
- unrestricted code changes across the repository
- replacing product judgment with agent judgment

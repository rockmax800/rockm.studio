# 16 — External Sources and Adoption Plan

## 1 — Purpose

This document defines which external repositories influence AI Workshop OS, how they are used, what is adopted now, what is deferred, and what must never be treated as direct product truth.

The goal is to avoid:

- vague "inspiration" with no operational meaning

- accidental over-integration

- legal ambiguity

- UI built around non-runtime concepts

- backend complexity imported without control

---

## 2 — Classification Model

Each external source must be classified as one of:

- architecture reference

- policy / skills reference

- development toolkit

- optional runtime component

- research-only corpus

No source should be treated as a direct dependency unless explicitly approved.

---

## 3 — Source Inventory

| Source | Type | V1 Status | Use Mode |
|---|---|---|---|
| OpenAI Symphony | architecture reference | adopt conceptually now | adapt architecture patterns |
| Agent Skills for Context Engineering | policy / skills reference | adopt selectively now | adapt context rules and skills |
| Everything Claude Code | development toolkit | adopt selectively now | extract patterns and workflow components |
| NVIDIA PersonaPlex | optional runtime component | defer to V2 | optional voice interface later |
| system-prompts-and-models-of-ai-tools | research-only corpus | research only | analyze patterns, do not copy |

---

## 4 — OpenAI Symphony

### Classification

architecture reference

### What it gives us

- isolated implementation runs
- workflow contract in repository
- orchestrator model
- workspace-per-task logic
- observability mindset
- proof-of-work concept
- handoff-before-done logic

### What we adopt in V1

- Run as first-class entity
- workspace/session isolation concept
- orchestration as backend core
- policy-in-repo principle
- run outcome visibility in UI

### What we do not adopt directly

- Linear-specific workflow
- exact implementation language
- exact tracker model
- assumption that issue tracker is the source of task truth

### Product impact

#### UI

- Runs screen
- run detail page
- proof-of-work panels
- activity feed
- task-to-run separation

#### Backend

- orchestration module design
- run lifecycle
- workspace manager concept
- workflow policy loader later

### Integration decision

Symphony is not a frontend plugin.

It is an architectural template for backend orchestration and UI object design.

---

## 5 — Agent Skills for Context Engineering

### Classification

policy / skills reference

### What it gives us

- context engineering principles
- context degradation awareness
- context compression methods
- multi-agent architecture patterns
- memory systems concepts
- filesystem-context methods
- evaluation patterns
- project-development skill structure

### What we adopt in V1

- context pack discipline
- progressive disclosure principle
- minimal relevant context
- explicit assumptions in context
- context compression mindset
- evaluation-aware agent behavior
- file-based context organization

### What we do not adopt directly

- full plugin marketplace installation as product architecture
- every skill in the repository
- advanced memory systems in V1
- hosted agent infrastructure in V1

### Product impact

#### UI

- context pack references in task and run detail
- docs-first navigation
- reference examples concept later

#### Backend

- context assembly module
- context snapshot records
- assumption tracking
- evaluation-aware workflows

### Integration decision

Use as a design source for context handling and agent instructions, not as a user-facing product dependency.

---

## 6 — Everything Claude Code

### Classification

development toolkit

### What it gives us

- verification loops
- memory persistence patterns
- subagent orchestration patterns
- multi-agent decomposition commands
- backend patterns
- frontend patterns
- database migration patterns
- api-design patterns
- Cursor-oriented install target and structure

### What we adopt in V1

- verification loop mindset
- reviewer and QA role patterns
- selective command/rule structure
- backend-patterns and api-design as implementation reference
- database migration discipline
- Cursor-friendly repo organization
- iterative retrieval / subagent orchestration ideas

### What we do not adopt directly

- all agents
- all commands
- all hooks
- all language packs
- all memory automation
- all MCP configurations

### Product impact

#### UI

- review-heavy workflow design
- clearer role separation
- future command center ideas later

#### Backend

- review loops
- task decomposition logic
- migration and API discipline
- optional worker and orchestration improvements later

### Integration decision

Use as a selective engineering playbook.

Do not import the full ecosystem into V1.

---

## 7 — NVIDIA PersonaPlex

### Classification

optional runtime component

### What it gives us

- real-time speech-to-speech interaction
- persona control through prompts and voice conditioning
- live interaction server model
- offline voice evaluation path

### What we adopt in V1

- nothing in core runtime

### What we may adopt in V2

- founder voice cockpit
- spoken project navigation
- spoken approval workflows
- spoken assistant mode

### What we do not adopt now

- live speech server in core stack
- voice as canonical control surface
- voice as source of truth

### Product impact

#### UI

none in V1

#### Backend

none in V1 core

### Integration decision

Documented as optional V2 voice adapter only.

---

## 8 — system-prompts-and-models-of-ai-tools

### Classification

research-only corpus

### What it gives us

- examples of system prompt structure
- examples of constraints
- examples of role segmentation
- examples of tool-use framing
- examples of guardrail language

### What we adopt in V1

- pattern observation only

### What we must not do

- copy prompts directly into product runtime
- treat the repository as canonical source
- import it as a project dependency
- use its content as licensing-safe implementation material by default

### Product impact

#### UI

none directly

#### Backend

none directly

### Integration decision

Research only.

Use for comparative analysis, never as a direct product component.

---

## 9 — Adoption Matrix

| Capability | Symphony | Agent Skills | Everything Claude Code | PersonaPlex | System Prompts Repo |
|---|---|---|---|---|---|
| task/run model | yes | no | partial | no | no |
| context engineering | partial | yes | partial | no | partial |
| role collaboration | partial | yes | yes | no | partial |
| review loops | partial | partial | yes | no | partial |
| voice interface | no | no | no | yes | no |
| frontend inspiration | partial | partial | partial | later | no |
| backend architecture | yes | partial | yes | no | no |
| direct runtime dependency | no | no | no | later optional | no |

---

## 10 — V1 Adoption Decision

We explicitly adopt in V1:

### From Symphony

- isolated run model
- workflow-oriented orchestration
- proof-of-work mindset
- observability-oriented execution

### From Agent Skills

- context pack design
- context minimization
- progressive disclosure
- context-aware multi-agent discipline

### From Everything Claude Code

- verification loops
- review and QA structure
- selected backend and migration patterns
- selective Cursor-oriented engineering conventions

We explicitly defer:

### From PersonaPlex

- all runtime voice features to V2

We explicitly restrict:

### From system-prompts-and-models-of-ai-tools

- research only
- no direct prompt reuse in product runtime

---

## 11 — Impact on Frontend Planning

The frontend must reflect adopted ideas, not imitate external repos literally.

### UI concepts derived from Symphony

- Runs as visible first-class objects
- proof-of-work visibility
- operational status screens

### UI concepts derived from Agent Skills

- context pack visibility
- scoped context over giant context dump
- explicit assumptions and missing-context warnings

### UI concepts derived from Everything Claude Code

- review-first workflow cues
- verification status
- role-specific work lanes
- rework loops and inspection views

### Not a UI priority

- voice controls
- model marketplace
- prompt browser
- plugin installation UX

---

## 12 — Impact on Backend Planning

### Symphony-derived backend priorities

- orchestration module
- run lifecycle
- workspace abstraction
- observability and eventing

### Agent Skills-derived backend priorities

- context pack builder
- context provenance
- scoped retrieval logic
- evaluation-aware outputs

### Everything Claude Code-derived backend priorities

- verification loops
- reviewer / QA pathways
- command/rule-inspired execution patterns
- migration discipline

### Deferred backend priorities

- voice stack
- advanced memory graph
- plugin marketplace architecture

---

## 13 — Legal / Operational Guardrails

### Allowed

- architectural inspiration
- pattern adaptation
- structural learning
- selective rule design based on observed principles

### Restricted

- copying third-party prompts into product runtime without review
- treating external examples as product truth
- importing heavyweight external systems without clear V1 need

### Licensing note

Every source must be reviewed according to its license before direct code or content reuse.

---

## 14 — Founder Decision

The founder chooses to build AI Workshop OS using:

- Symphony as orchestration reference
- Agent Skills as context-engineering reference
- Everything Claude Code as selective engineering operations reference
- PersonaPlex as a deferred voice option
- system-prompts-and-models-of-ai-tools as a research-only corpus

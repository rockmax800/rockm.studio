# 19 — Tech Stack Decision V1

## 1 — Purpose

This document defines the canonical technology stack for AI Workshop OS V1.

It replaces any earlier tech suggestions in other docs and becomes the single source of truth for stack decisions.

All agents, tools, and contributors must follow this stack unless an explicit exception is approved by the founder.

---

## 2 — Stack Summary

| Layer | Technology |
|---|---|
| Language | TypeScript (everywhere) |
| Frontend | Next.js, Tailwind CSS, shadcn/ui |
| Client data | TanStack Query (React Query) |
| Backend | NestJS |
| Validation | Zod |
| ORM | Prisma |
| Database | PostgreSQL 16 or 17 |
| Queue | Redis + BullMQ |
| Infra | Docker Compose |
| Auth | Simple internal access first, proper auth later |
| Realtime | WebSocket later, not in first sprint |

---

## 3 — Why This Stack

### 3.1 TypeScript everywhere

- one language across frontend and backend
- best LLM compatibility for code generation and repair
- type safety across API boundaries via shared packages

### 3.2 Next.js for frontend

- standard React framework for internal panels and control planes
- App Router with server components and route handlers for light server-side logic
- strong AI tooling support
- Tailwind + shadcn/ui gives fast, consistent, themeable UI

### 3.3 NestJS for backend

- structured server framework for complex backend logic
- supports Express or Fastify
- built-in module system matches domain-driven module organization
- officially positioned for scalable server-side Node.js applications
- separates orchestration, lifecycle guards, workers, and provider routing from the UI layer

### 3.4 Why not Next.js alone for backend

The backend is not a simple API layer. It includes:

- lifecycle guards
- orchestration actions
- worker jobs
- provider routing
- review loops
- approval gates
- event logging
- GitHub and AI provider integrations

Putting all of this into Next.js route handlers would be manageable at first but degrade quickly. NestJS as a separate backend application gives clean separation and growth room.

### 3.5 Prisma ORM

- type-safe database access
- migration system
- officially supports PostgreSQL including self-hosted
- well understood by LLMs

### 3.6 PostgreSQL

- relational integrity for workflows, reviews, approvals
- transactions
- audit events
- queue coordination
- no discussion — the right choice for stateful workflow systems

Not MongoDB. Not SQLite for core. Not Firebase.

### 3.7 Redis + BullMQ

- standard Node.js queue system
- run execution, retries, delayed jobs, background processing
- BullMQ officially runs on Redis with Queue and Worker entities
- well understood by LLMs and AI agents

### 3.8 LLM-friendliness

This entire stack is among the most common and predictable for AI-assisted development:

- TypeScript, Next.js, NestJS, Prisma, PostgreSQL, Tailwind — widely represented in training data
- models generate and repair this stack better than exotic alternatives
- Cursor, Lovable, and future agents work well with this structure

---

## 4 — Monorepo Structure

V1 uses a monorepo with two applications and shared packages.

```
/apps
  /web        → Next.js UI
  /api        → NestJS backend
/packages
  /shared     → types, schemas, enums, DTOs
  /config     → shared configuration
  /ui         → shared UI components if needed
/infrastructure
  docker-compose.yml
```

Why:

- clear separation of frontend and backend
- shared types prevent drift
- understandable for humans, Cursor, and AI agents
- scales without microservice overhead

---

## 5 — What Is Not In V1

Do not use in V1:

- Python backend as core (frontend is React/Next, keep language unified)
- microservices architecture
- GraphQL (REST + typed DTOs is sufficient)
- Kafka
- Kubernetes
- event sourcing
- exotic ORMs
- Supabase as the core product architecture
- MongoDB or Firebase for primary data

These would slow down V1 without proportional benefit.

---

## 6 — Database Decision

PostgreSQL is the only database for V1 core.

Requirements it satisfies:

- foreign key relationships
- transactions
- stateful workflow storage
- review and approval traceability
- queue coordination
- audit event storage

Version: PostgreSQL 16 or 17 (both currently supported).

Deployment: self-hosted on the same server or VPS, managed by Docker Compose.

---

## 7 — Queue Decision

Redis + BullMQ is the queue system for V1.

Use cases:

- run execution queue
- review queue
- retry queue
- background processing
- delayed jobs

BullMQ provides Queue and Worker abstractions on top of Redis.

No need for Kafka, RabbitMQ, or SQS in V1.

---

## 8 — Frontend Decision

Next.js App Router is the frontend framework.

UI toolkit: Tailwind CSS + shadcn/ui.

Client-side data fetching: TanStack Query (React Query).

The frontend is a control surface. It reflects backend state and triggers allowed actions.

It does not own business logic or workflow rules.

---

## 9 — Auth Decision

V1 starts with simple internal access (no public-facing auth).

Proper authentication will be added later when needed.

Options for later:

- NextAuth.js
- custom JWT
- session-based auth

Not a V1 priority.

---

## 10 — Realtime Decision

WebSocket support is deferred to after the first sprint.

When added, it will be used for:

- live run status updates
- dashboard refresh
- notification delivery

Not needed for core workflow functionality in V1.

---

## 11 — Pixel Office Decision

The pixel office visualization layer is V2.

When it arrives, candidates include:

- PixiJS
- Phaser
- HTML/CSS grid for a lightweight version

It will be built on top of the control plane, not instead of it.

---

## 12 — Infrastructure Decision

V1 deployment:

- Docker Compose
- single VPS or server
- Nginx later for reverse proxy
- GitHub integration for source control
- OpenAI API for model execution
- Anthropic API for model execution

No cloud-native orchestration (no Kubernetes, no ECS) in V1.

---

## 13 — Relationship to Current Lovable Prototype

The current Lovable project serves as:

- UI prototyping environment
- documentation workspace
- design system exploration
- mock data validation

It is not the final production runtime.

The production system will be built in the monorepo structure defined in section 4 using the stack defined in this document.

Lovable remains useful for:

- rapid UI iteration
- component design
- visual testing
- documentation management

---

## 14 — Founder Decision

The canonical V1 tech stack for AI Workshop OS is:

- TypeScript everywhere
- Next.js + Tailwind + shadcn/ui for frontend
- NestJS for backend
- Prisma ORM
- PostgreSQL 16/17
- Redis + BullMQ for queues
- Docker Compose for infrastructure
- simple internal auth first
- WebSocket later
- pixel office in V2

This decision is final for V1 and must be respected by all agents and tools.

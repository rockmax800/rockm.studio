---
layer: core
criticality: critical
enabled_in_production: yes
---

# 40 — Runtime Separation & Secret Governance

> Layer 1 — Core Engine
>
> **Always active.** Defines execution boundaries, process separation, and secret injection rules.

## 1 — Purpose

Formalizes the separation between Control Plane, Execution Plane, Sandbox Environment, and External Systems. Ensures secrets are scoped, never leaked, and never cross plane boundaries inappropriately.

---

## 2 — Runtime Separation Model

### 2.1 — Control Plane

The user-facing application process.

| Responsibility | Examples |
|---------------|----------|
| UI rendering | Next.js, Founder Dashboard, Client Portal |
| API routing | `/api/*` route handlers |
| State orchestration | OrchestrationService, ApprovalService |
| Event logging | event_log, activity_events, outbox_events |
| Query and projection | Dashboard data, diagnostics |

**Hard constraints:**

- ❌ No direct code execution
- ❌ No `docker run` or `docker exec`
- ❌ No git operations (clone, commit, push)
- ❌ No SSH to VPS
- ❌ No file system access outside application root
- ❌ No secret injection into responses

### 2.2 — Execution Plane (Worker Runtime)

A separate process responsible for all code execution and deployment operations.

| Responsibility | Examples |
|---------------|----------|
| Run execution | RunExecutor, SandboxExecutorService |
| Workspace management | RepoWorkspace creation, git clone/commit/push |
| Container orchestration | Docker sandbox launch, monitoring, cleanup |
| CI status tracking | CheckSuite polling |
| Deployment operations | Docker build, registry push, VPS deploy |

**Hard constraints:**

- ✅ Runs as separate OS process
- ✅ No shared memory with Control Plane
- ✅ Communicates only via PostgreSQL + event_log
- ❌ No direct UI rendering
- ❌ No API request handling

### 2.3 — Sandbox Environment

Isolated Docker containers where AI-generated code executes.

| Responsibility | Examples |
|---------------|----------|
| Code execution | Agent-generated scripts, build commands |
| Repository access | Read-only clone via scoped token |

**Hard constraints:**

- ✅ Docker container with resource limits (see `delivery/sandbox-and-execution-isolation.md`)
- ✅ Non-root user (1000:1000)
- ❌ No production deploy credentials
- ❌ No SSH keys
- ❌ No registry credentials
- ❌ No DNS credentials
- ❌ No database connection string
- ❌ No Control Plane secrets

### 2.4 — External Systems

| System | Role | Interaction Plane |
|--------|------|-------------------|
| GitHub | VCS, CI | Execution Plane only |
| VPS | Deploy target | Execution Plane only |
| Container Registry (ghcr.io) | Image storage | Execution Plane only |
| DNS Provider | Domain binding | Execution Plane only |
| PostgreSQL | Shared state | Both Control + Execution |

---

## 3 — Communication Model

```
┌──────────────────┐                  ┌──────────────────┐
│  CONTROL PLANE   │                  │ EXECUTION PLANE  │
│                  │                  │                  │
│  Next.js UI      │                  │  RunExecutor     │
│  API Routes      │    PostgreSQL    │  Docker Sandbox  │
│  Orchestration   │◄───────────────►│  Git Operations  │
│  Dashboards      │   (event_log)   │  CI Tracking     │
│  Client Portal   │                  │  Deployments     │
│                  │                  │                  │
└──────────────────┘                  └──────────────────┘
        │                                     │
        │                                     ├──► GitHub
        │                                     ├──► VPS (SSH)
        ▼                                     ├──► Registry
   UI only                                    └──► DNS
```

**Rule:** Control Plane and Execution Plane never communicate directly. All state synchronization happens through PostgreSQL tables and the event_log.

---

## 4 — Secret Classification

### 4.1 — Secret Classes

| Secret | Class | Scope | Available To |
|--------|-------|-------|-------------|
| GitHub Token (repo-scoped) | execution | Repository clone/push | Execution Plane, Sandbox (read-only) |
| SSH Deploy Key | deploy | VPS access | Execution Plane only |
| Container Registry Credentials | deploy | Image push/pull | Execution Plane only |
| DNS Provider Credentials | deploy | DomainBinding operations | Execution Plane only |
| Database Connection String | infra | PostgreSQL access | Control Plane, Execution Plane |
| API Provider Keys (OpenAI, Anthropic) | execution | LLM calls | Execution Plane only |
| Admin Auth Token | control | Founder authentication | Control Plane only |

### 4.2 — Secret Injection Matrix

| Secret | Control Plane | Execution Plane | Sandbox Container | event_log | Logs |
|--------|:------------:|:---------------:|:-----------------:|:---------:|:----:|
| GitHub Token | ❌ | ✅ | ✅ (read-only) | ❌ | ❌ |
| SSH Deploy Key | ❌ | ✅ | ❌ | ❌ | ❌ |
| Registry Creds | ❌ | ✅ | ❌ | ❌ | ❌ |
| DNS Creds | ❌ | ✅ | ❌ | ❌ | ❌ |
| DB Connection | ✅ | ✅ | ❌ | ❌ | ❌ |
| LLM API Keys | ❌ | ✅ | ❌ | ❌ | ❌ |
| Admin Token | ✅ | ❌ | ❌ | ❌ | ❌ |

### 4.3 — Sandbox Secret Rules

Inside a Docker sandbox container:

**Allowed:**
- Read-only GitHub token for repository clone/pull (scoped to specific repo)

**Forbidden:**
- SSH deploy key
- Container registry credentials
- DNS credentials
- Database connection string
- Control Plane secrets (admin auth, session tokens)
- LLM API keys (model calls happen in Execution Plane, not sandbox)

---

## 5 — Secret Storage Rules

| Rule | Enforcement |
|------|------------|
| Secrets stored in environment config or vault | `src/config/env.ts` validation |
| Never stored in database plain text | Code review + audit |
| Never logged in event_log | writeEventLog sanitization |
| Never in activity_events payload | Sanitization at write time |
| Masked in application logs | Logger masking (sensitive field list) |
| Never committed to repository | `.gitignore` + secret scanning |
| Rotatable without downtime | Environment variable injection |

---

## 6 — Deployment Security Flow

### 6.1 — Secret Usage Per Step

```
Step 1: Build Docker image
  → No secrets needed (source code only)

Step 2: Push to registry
  → Registry credentials (Execution Plane only)

Step 3: SSH to VPS
  → SSH deploy key (Execution Plane only)

Step 4: Pull image on VPS
  → Registry credentials on VPS (pre-configured)

Step 5: Restart container
  → SSH deploy key (Execution Plane only)

Step 6: Health check
  → No secrets needed (HTTP health endpoint)
```

### 6.2 — Deployment Security Invariants

1. Build step has no access to production secrets
2. Registry credentials never enter sandbox containers
3. SSH key is never available to sandbox containers
4. Health check uses public endpoint (no auth required)
5. Same Docker image promoted from staging → production (no rebuild)

---

## 7 — Execution Security Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Secret leakage via logs | Medium | High | Log masking, event_log sanitization |
| Sandbox escape | Low | Critical | Docker security options, no privileged mode, non-root user |
| Credential misuse by agent | Low | High | Scoped tokens, read-only in sandbox, no deploy creds |
| Domain misbinding | Low | Medium | DomainBinding requires founder approval, DNS creds not in sandbox |
| Destructive git operations | Low | High | Scoped GitHub token, branch protection, no force push |
| DB connection from sandbox | Low | Critical | Connection string never injected into container |
| LLM key extraction | Low | Medium | Keys in Execution Plane env only, not passed to sandbox |

---

## 8 — Learning Plane Secret Access

**The Learning Plane (Knowledge Plane) has NO secret access.**

| Secret | Learning Plane Access |
|--------|:--------------------:|
| GitHub Token | ❌ |
| SSH Key | ❌ |
| Registry Creds | ❌ |
| DNS Creds | ❌ |
| DB Connection | Read-only (via service layer, not direct) |
| LLM API Keys | ❌ (model calls go through Execution Plane) |

Learning Plane entities (`evaluation_runs`, `learning_proposals`) operate on copied context snapshots — never on live repositories or production systems.

---

## 9 — Hard Rules Summary

| # | Rule | Violation Response |
|---|------|-------------------|
| 1 | Control Plane never executes code | GuardError, architectural violation |
| 2 | Sandbox never has production deploy credentials | Container launch validation |
| 3 | Learning Plane never has secret access | Service layer isolation |
| 4 | Secrets never written to event_log | writeEventLog sanitization |
| 5 | Secrets never in activity_events | Payload sanitization |
| 6 | Secrets never committed to repository | Secret scanning |
| 7 | Deploy credentials never in sandbox | Docker env validation |
| 8 | Control and Execution Plane share no memory | Separate OS processes |

---

## 10 — Related Documents

| Document | Relationship |
|----------|-------------|
| `delivery/sandbox-and-execution-isolation.md` | Sandbox resource limits and Docker execution model |
| `delivery/delivery-lane.md` | Full deployment pipeline using secrets defined here |
| `delivery/risk-and-safety-matrix.md` | Risk categories including execution security |
| `core/13-operational-planes.md` | Plane isolation guarantees |
| `00-system-overview.md` | Architecture overview with runtime diagram |

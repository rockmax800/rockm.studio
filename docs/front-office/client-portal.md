---
layer: core
criticality: important
enabled_in_production: yes
doc_kind: reference
load_strategy: retrieve
---

# 34 — Client Portal

> Layer 1 — Core Engine
>
> Read-only external view for clients to track project progress.

## 1 — Purpose

Provide clients with a secure, limited view of their project's progress without exposing internal system details (HR, model performance, provider data, token usage, sandbox logs, CI internals).

---

## 2 — Data Model

### clients

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| name | text | Client display name |
| contact_email | text | Client contact email |
| created_at | timestamptz | Creation time |

### client_project_access

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid FK | References clients.id |
| project_id | uuid FK | References projects.id |
| access_token_hash | text | SHA-256 hash of access token |
| expires_at | timestamptz | Token expiration |
| created_at | timestamptz | Creation time |

**Security**: Only the hash is stored. The raw token is given to the client once and never persisted.

---

## 3 — Access Model

```
Client receives link:  /client/{access_token}
                             ↓
          Hash token → lookup client_project_access
                             ↓
              Check expires_at > now()
                             ↓
              Resolve project_id → fetch safe data
```

---

## 4 — Data Exposure Boundaries

### ✅ EXPOSED to clients

| Data | Fields |
|------|--------|
| Project | name, state, current_phase |
| Tasks | title, state |
| Deployments | environment, status, preview_url, version_label |
| Release Notes | title, summary, created_at (accepted artifacts only) |
| Timeline | project.activated, milestone.completed, deployment.live, task.done, release.completed |
| Progress | % of tasks done |

### ❌ HIDDEN from clients

| Category | Why |
|----------|-----|
| Run logs, sandbox output | Internal execution detail |
| Provider info, model names | Proprietary infrastructure |
| Token usage, cost estimates | Commercial sensitivity |
| Employee performance, HR data | Internal operations |
| CI details, check suites | Internal quality process |
| Error classes, diagnostics | Internal debugging |
| Internal comments, reviews | Internal collaboration |

---

## 5 — Preview Links

| Condition | Shown |
|-----------|-------|
| Staging deployment with status=live | Staging preview URL |
| Production deployment with status=live | Production live URL |

---

## 6 — Safe Activity Events

Only these event types are shown in the client timeline:

- `project.activated`
- `milestone.completed`
- `deployment.live`
- `task.done`
- `release.completed`

All other event types are filtered out before data reaches the client.

---

## 7 — Security Invariants

1. **Token hashing**: access_token is SHA-256 hashed before storage. Raw token never persisted.
2. **Expirable access**: every access link has an `expires_at` timestamp.
3. **No project ID exposure**: clients see the project via opaque token, never the internal UUID.
4. **No editing**: the portal is strictly read-only. No mutations are available.
5. **No navigation**: the portal is a standalone page, not connected to the internal app layout.
6. **Data filtering**: all queries select only safe columns — no `SELECT *` patterns.

---

## 8 — Route

| Route | Component | Layout |
|-------|-----------|--------|
| `/client/:token` | `ClientPortal` | Standalone (no AppLayout) |

The route is outside the internal navigation system and does not require authentication.

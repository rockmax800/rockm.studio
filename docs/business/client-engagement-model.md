---
layer: business
criticality: informational
enabled_in_production: no
doc_kind: reference
load_strategy: retrieve
---

# Client Engagement Model

> Business Layer — How clients interact with the studio.

## 1 — Purpose

Defines the client-facing engagement lifecycle and communication boundaries.

---

## 2 — Engagement Phases

| Phase | Client Action | Studio Action |
|-------|--------------|---------------|
| Discovery | Submit brief | Generate presale estimate |
| Scoping | Review blueprint | Produce blueprint + estimate |
| Decision | Approve / reject | Await launch decision |
| Delivery | Monitor portal | Execute project |
| Review | Provide feedback | Iterate or complete |
| Handover | Accept delivery | Archive project |

---

## 3 — Client Portal Access

- Clients receive a unique, expirable access token.
- Portal is read-only — no editing capability.
- Exposed: project state, task titles, deployment URLs, milestones.
- Hidden: internal logs, provider details, HR data, token costs.

See `front-office/client-portal.md` for technical details.

---

## 4 — Communication Rules

- Founder is the sole client-facing contact.
- AI agents do not communicate directly with clients.
- All client-visible content is founder-approved.

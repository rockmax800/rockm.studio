---
layer: company
criticality: optional
enabled_in_production: no
---

# 16 — Company Blog Module

> Layer 2 — Company Layer
>
> **Disabled in Production Mode.** Requires `enable_blog` feature flag. See `08-feature-flags.md`.

## 1 — Purpose

AI-generated marketing posts based on real company events. All posts require founder approval.

---

## 2 — BlogPost Entity

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| title | string | |
| content | text | Generated content |
| event_type | string | Source event type |
| event_reference_id | uuid | Source event ID |
| tone | enum | professional, casual, technical |
| platform | enum | linkedin, telegram, blog, twitter |
| status | enum | draft, approved, published |
| created_at | timestamp | |
| approved_at | timestamp | |

---

## 3 — Event Detection

Significant events that trigger draft creation:
- `project.activated`, `project.completed`
- `task.done` (major milestones only)
- Employee hired, replaced
- Model upgrade
- Prompt updated
- Release completed

Low-level transitions are filtered out.

---

## 4 — Content Generation

- AI copywriter role via ProviderService
- Prompt focuses on authenticity — no hype, no fictional metrics
- Max 3 auto-draft posts per day
- Aggregate similar events (e.g. multiple hires → 1 post)

---

## 5 — Safety

- Never invent metrics — only actual DB data
- No financial claims or promises
- No auto-publishing
- Founder is always final approver

---

## 6 — UI Location (v2.1)

Blog is displayed as the **Media & SMM** card inside the Company page (`/company`).
Badge color: green. Includes "Generate Post from Recent Events" CTA button and per-post approve action.

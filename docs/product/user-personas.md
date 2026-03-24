---
layer: product
criticality: informational
enabled_in_production: no
---

# User Personas

> Product Layer — Who uses AI Production Studio.

## 1 — Primary: The Founder

- Solo technical founder running a production studio.
- Makes all strategic and approval decisions.
- Does not write code directly — delegates to AI agents.
- Monitors quality, cost, and timeline.
- Manages client relationships.

---

## 2 — Secondary: The Client

- External stakeholder who commissions work.
- Interacts only through the Client Portal (read-only).
- Sees: project state, milestones, deployment URLs.
- Does not see: internal operations, agent performance, costs.

---

## 3 — Tertiary: AI Agents

- Execute tasks within defined domain boundaries.
- Operate under lifecycle state machine rules.
- Cannot override founder decisions.
- Performance is tracked and evaluated.

---

## 4 — Not a User

- General public (no public-facing features in v1).
- Other founders or team members (single-user system).
- DevOps engineers (infrastructure is founder-managed).

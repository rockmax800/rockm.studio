---
layer: business
criticality: informational
enabled_in_production: no
---

# Pricing Strategy

> Business Layer — Cost structure and pricing approach.

## 1 — Purpose

Documents the pricing model for AI Production Studio services.

---

## 2 — Cost Components

| Component | Source |
|-----------|--------|
| AI model tokens | Provider billing (per 1k tokens) |
| Compute | VPS hosting + Docker runtime |
| Review overhead | Founder time for approvals |
| Infrastructure | Database, storage, CI/CD |

---

## 3 — Pricing Model

_To be finalized. Current approach:_

- **Cost-plus**: Base cost (tokens + compute) + margin.
- **Effort-band pricing**: Fixed price per effort band (small/medium/large/xlarge).
- **Token budgets**: Per-project ceiling prevents cost overruns.

See `token-economy-and-budgeting.md` for detailed cost analysis.

---

## 4 — Guardrails

- No project exceeds its approved budget without founder re-approval.
- Estimates include worst-case projections.
- Client sees estimated range, not internal token costs.

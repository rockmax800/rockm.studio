---
layer: business
criticality: informational
enabled_in_production: no
doc_kind: reference
load_strategy: never
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

## 4 — Relationship to Market Benchmarking

Pricing strategy defines what the **client sees**. The Market Benchmarking Engine (`market-benchmarking-engine.md`) is a **founder-only** internal tool that compares AI internal cost vs human-equivalent cost vs studio offer price. Benchmarking data informs the founder's pricing decisions but is never exposed to clients or used to auto-adjust prices.

---

## 5 — Guardrails

- No project exceeds its approved budget without founder re-approval.
- Estimates include worst-case projections.
- Client sees estimated range, not internal token costs.
- Benchmark metrics (HEC, AIC, Advantage Ratio) are never included in client-facing estimates or portal.

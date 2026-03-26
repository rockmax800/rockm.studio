---
layer: business
criticality: informational
enabled_in_production: no
visibility: founder-only
doc_kind: reference
load_strategy: never
---

# Market Benchmarking Engine

> Business Layer — Founder-only strategic analytics module.

## 1 — Purpose

Compares **AI internal cost** vs **human-equivalent market cost** vs **founder offer price** to answer four strategic questions:

1. **Am I underpricing or overpricing?** — Is the studio offer price positioned correctly relative to what a human team would charge and what AI execution actually costs?
2. **How much more efficient are we than a human team?** — What is the real advantage ratio between AI delivery and equivalent human staffing?
3. **Where is the pricing ceiling?** — At what price does the studio lose competitiveness against human alternatives?
4. **When is a project economically pointless?** — Below what margin threshold should the founder decline work?

This is a **strategic compass**, not pricing automation. It does not set prices, modify delivery state, or appear in any client-facing surface.

---

## 2 — Boundary Rules

| Rule | Detail |
|------|--------|
| Visibility | **Founder-only.** Never exposed in Client Portal, client reports, or external estimates. |
| Delivery coupling | **None.** Does not influence task state transitions, run execution, approval gates, or deployment flow. |
| **Hard rule: no delivery triggers** | **Market Benchmarking may inform founder judgment but cannot directly trigger or block Delivery Plane transitions.** No benchmark metric may appear as a guard condition, gate prerequisite, or automated decision input in the Delivery Plane state machine. |
| Pricing coupling | **None.** Studio Offer Price is a founder input, not an output of this module. See `pricing-strategy.md` for client-facing pricing. |
| Token budgeting coupling | **Read-only.** May consume AIC data from `token-economy-and-budgeting.md` as an input, but never writes back or modifies budget limits. |
| Assumption versioning | **Required.** Every benchmark calculation must reference a named assumption set with date and source. |
| Client Portal exclusion | **Explicit.** `ClientPortal.tsx` must never import, render, or reference any market benchmarking data, types, or components. This is verified by code review. |

---

## 3 — Inputs

| Input | Source | Override |
|-------|--------|----------|
| Blueprint-derived role mix | Extracted from blueprint contract (roles, estimated hours per role) | Founder can override role list and hour estimates |
| Salary benchmarks by country | Founder-maintained reference table (annual salary per role per country) | Founder sets and updates |
| Overhead multipliers | Taxes, benefits, office, tooling — expressed as percentage on top of salary | Founder sets per country/region |
| Velocity profiles | Estimated human velocity vs AI velocity per role type | Founder sets; may be auto-suggested from historical run data |
| Founder-entered Studio Offer Price (SOP) | Manual founder input per project or effort band | Always manual |
| AI Internal Cost (AIC) | Aggregated from token usage, compute, and infrastructure costs | Sourced from `token-economy-and-budgeting.md` tracking; founder can override |

### Auto-suggestion rule

Role mix and velocity profiles **may** be auto-suggested from blueprint data and historical runs, but the founder **must** confirm or override before any calculation is used for decision-making. No silent defaults.

---

## 4 — Outputs

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Human Equivalent Cost (HEC)** | Σ (role_hours × hourly_rate × overhead_multiplier) | What a human team would cost to deliver the same scope |
| **AI Internal Cost (AIC)** | Σ (token_cost + compute_cost + infra_share) | What it actually costs the studio to deliver with AI |
| **Studio Offer Price (SOP)** | Founder input | What the founder charges the client |
| **Advantage Ratio** | HEC / AIC | How many times cheaper AI delivery is vs human equivalent |
| **Value Capture** | SOP − AIC | Absolute margin per project |
| **Gross AI Margin** | (SOP − AIC) / SOP × 100% | Percentage margin on the studio offer |
| **Price Ceiling** | HEC × competitive_factor | Maximum price before clients prefer human teams |
| **Economic Viability** | Value Capture > min_margin_threshold | Whether the project is worth taking |

---

## 5 — Assumption Versioning

Every benchmark run must reference a named assumption set:

```
assumption_set:
  name: "EU-2025-Q1"
  date: "2025-01-15"
  salary_source: "Glassdoor + Levels.fyi averages"
  overhead_pct: 35
  velocity_basis: "Internal run history (47 completed projects)"
  competitive_factor: 0.85
  min_margin_threshold_usd: 200
```

Assumptions are **not auto-updated**. The founder reviews and publishes new assumption sets manually.

---

## 6 — What This Is Not

| Misconception | Reality |
|---------------|---------|
| "This sets prices" | No. SOP is always a founder input. This module only compares. |
| "This is visible to clients" | No. Client Portal and estimate reports never reference benchmark data. |
| "This controls delivery budgets" | No. Token budgets are managed by `token-economy-and-budgeting.md`. This module reads AIC but does not write budget limits. |
| "This auto-adjusts based on market" | No. All inputs are founder-maintained. No external API calls or market data feeds. |
| "This replaces the estimate report" | No. Estimate reports (front-office) are client-facing. Benchmarking is internal strategic analysis. |

---

## 7 — Relationship to Other Business Docs

| Document | Relationship |
|----------|-------------|
| `pricing-strategy.md` | Pricing strategy defines client-facing pricing model. Benchmarking provides internal comparison data the founder uses when setting prices. No direct coupling. |
| `token-economy-and-budgeting.md` | Token economy tracks actual AI costs. Benchmarking consumes AIC as a read-only input. |
| `operating-model.md` | Operating model defines founder role. Benchmarking is a founder-only strategic tool within that model. |
| `revenue-tracking.md` | Revenue tracking records actual income. Benchmarking provides projected comparisons, not actuals. |

---

## 8 — Implementation Status

| Component | Status |
|-----------|--------|
| Documented specification | ✅ This document |
| Type definitions (`src/types/market-benchmark.ts`) | ✅ Implemented |
| Pure calculation engine (`src/lib/business/market-benchmarking.ts`) | ✅ Implemented |
| Default benchmarks (`src/config/market-benchmark-defaults.ts`) | ✅ Implemented |
| Role-mix suggestion from blueprint | ✅ Implemented (deterministic heuristic) |
| UI panel in IntakeComposer / CompanyLeadSession | ✅ Implemented (founder-only, collapsible) |
| Versioned snapshot persistence (`market_benchmark_snapshots`) | ✅ Implemented |
| Snapshot history viewer | ✅ Implemented |
| AIC auto-import from token tracking | ⬜ Not implemented (manual input) |
| Historical velocity derivation | ⬜ Not implemented |
| Client Portal exclusion verified | ✅ Verified — no benchmark imports or references |
| ProjectDetail exclusion verified | ✅ Verified — no benchmark data in delivery controls |

When implemented, this will be a read-only analytics panel inside the Founder dashboard or a dedicated founder-only route. It will never write to delivery entities.

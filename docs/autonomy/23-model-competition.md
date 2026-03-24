---
layer: autonomy
criticality: experimental
enabled_in_production: no
doc_kind: reference
load_strategy: retrieve
---

# 23 — Model Competition

> Layer 3 — Autonomy & Evolution
>
> **Disabled in Production Mode.** Requires `enable_model_competition` feature flag. See `08-feature-flags.md`.

## 1 — Purpose

Internal model competition for new hire decisions — rotate between top models and track performance.

---

## 2 — When Active

Only when `enable_model_competition` feature flag is `true` (experimental mode only).

---

## 3 — Competition Flow

1. For new hires: identify top 2 models from hiring market rankings
2. Rotate between them for first 20 runs
3. Track performance metrics per model
4. After 20 runs, generate comparison report
5. Create recommendation (NOT auto-execute)
6. Founder decides which model to keep

---

## 4 — Metrics Tracked

All metrics use unified terminology from `core/09-performance-scoring.md` §7:
- `success_rate` per model
- `avg_cost` per model
- `avg_latency` per model
- `bug_rate` per model
- `quality_score` per model

Ranking uses `competition_score` formula from `core/09-performance-scoring.md` §3.

---

## 5 — Safety

- Competition mode is opt-in per team
- Does not affect existing active employees
- Results are advisory only
- No auto-switching during competition

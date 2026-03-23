---
layer: autonomy
criticality: optional
enabled_in_production: yes (lean mode IS the production recommendation)
---

# 21 — Lean Mode

> Layer 3 — Autonomy & Evolution

## 1 — Purpose

Minimal operating configuration that reduces token usage while maintaining core workflow functionality.

---

## 2 — What Lean Mode Disables

- Autonomy pipeline (idea generation, auto-task creation)
- Dual verification (second model check)
- Self-review (agent reviewing own output before submission)
- Context compression (token-saving summarization)
- Bottleneck predictions (periodic analysis)
- Blog auto-drafting

All disabled via feature flags — see `08-feature-flags.md`.

---

## 3 — What Lean Mode Keeps

- Core workflow: Task → Run → Artifact → Review → Approval (defined in `core/03-state-machine.md`)
- State machine guards (defined in `core/05-guard-matrix.md`)
- Orchestration use cases (defined in `core/06-orchestration-use-cases.md`)
- Provider routing (primary only, no fallback)
- Activity events
- Basic employee performance tracking

---

## 4 — Activation

Set system mode to `production` (see `07-system-mode.md`). All experimental features are automatically disabled.

---

## 5 — Expected Token Savings

Estimated 60–80% reduction in token usage compared to full Company + Experimental mode.
See `28-token-economy-and-budgeting.md` for detailed cost analysis.

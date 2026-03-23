---
layer: autonomy
criticality: experimental
enabled_in_production: no
---

# 25 — Spec-to-Release Mode

> Layer 3 — Autonomy & Evolution
>
> **Disabled in Production Mode.** Requires full Experimental mode with autonomy enabled.

## 1 — Purpose

End-to-end autonomous delivery pipeline from specification to release candidate.

---

## 2 — Pipeline

1. Founder provides spec/brief
2. System generates task breakdown
3. System assigns tasks to employees
4. Runs execute with standard review (uses core workflow from `core/03-state-machine.md`)
5. Artifacts collected and assembled
6. Release candidate submitted for founder review

**Does NOT define new state transitions.** Uses existing core lifecycle throughout.

---

## 3 — Requirements

- Full Experimental mode enabled (`07-system-mode.md`)
- Autonomy settings active (`enable_autonomy` flag)
- Sufficient token budget (`26-safety-budget-controls.md`)
- Active employees for all required roles

---

## 4 — Founder Intervention Points

- Spec approval (before pipeline starts)
- Architecture decisions (if flagged)
- Release candidate review (at the end)
- Any escalation during pipeline

---

## 5 — Status

Experimental. Not recommended for production client projects.
High token usage — see `28-token-economy-and-budgeting.md`.

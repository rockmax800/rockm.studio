---
layer: business
criticality: informational
enabled_in_production: no
doc_kind: contract
load_strategy: auto
---

# Delivery SLA

> Business Layer — Service level expectations.

## 1 — Purpose

Defines expected delivery timelines and quality commitments.

---

## 2 — Timeline Expectations

| Effort Band | Target Delivery | Maximum |
|-------------|----------------|---------|
| small | 1–3 days | 5 days |
| medium | 3–7 days | 14 days |
| large | 7–21 days | 30 days |
| xlarge | 21–60 days | 90 days |

_Timelines are estimates, not guarantees. Subject to scope complexity._

---

## 3 — Quality Commitments

- All code passes automated CI checks before delivery.
- All artifacts undergo at least one review cycle.
- Staging deployment available before production promotion.
- Founder approves every production release.

---

## 4 — Escalation

If delivery exceeds maximum timeline:
1. Founder reviews blockers.
2. Scope reduction or re-estimation triggered.
3. Client notified via portal status update.

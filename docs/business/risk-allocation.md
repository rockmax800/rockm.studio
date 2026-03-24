---
layer: business
criticality: informational
enabled_in_production: no
---

# Risk Allocation

> Business Layer — How risks are distributed between studio and client.

## 1 — Purpose

Defines risk ownership boundaries for project delivery.

---

## 2 — Risk Matrix

| Risk | Owner | Mitigation |
|------|-------|-----------|
| Scope creep | Client + Founder | Blueprint contract with explicit out-of-scope |
| Cost overrun | Studio | Token budgets with hard ceilings |
| Quality issues | Studio | Multi-layer review + CI gates |
| Timeline slip | Studio | Effort-band estimation with worst-case buffer |
| Provider outage | Studio | Multi-provider fallback routing |
| Data loss | Studio | Transactional outbox + audit trail |
| Security breach | Studio | RLS policies, hashed tokens, no direct DB exposure |

---

## 3 — Client Responsibilities

- Provide clear business goals in intake request.
- Review and approve blueprints in timely manner.
- Report issues through established channels.

---

## 4 — Studio Responsibilities

- Deliver within estimated budget.
- Maintain audit trail for all decisions.
- Provide transparent progress via client portal.

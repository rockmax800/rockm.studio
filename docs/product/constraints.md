---
layer: product
criticality: informational
enabled_in_production: yes
doc_kind: contract
load_strategy: auto
---

# Constraints

> Product Layer — Hard constraints that shape all design decisions.

## 1 — Infrastructure Constraints

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| Deploy target | Single VPS | Simplicity, cost control |
| Container runtime | Docker | Standard, reproducible |
| VCS | GitHub only | Single integration surface |
| CI | GitHub Actions only | Integrated with VCS |
| Database | PostgreSQL + Prisma | Docker-managed, single instance |
| Backend | NestJS + TypeScript | Modular monolith |
| Queue | Redis + BullMQ | Job scheduling, retry |

---

## 2 — Operational Constraints

| Constraint | Value |
|-----------|-------|
| Auto-production deploy | **Forbidden** |
| Force merge | **Forbidden** |
| Auto domain binding | **Forbidden** |
| Anonymous signups | **Forbidden** |
| Multi-user access | Not supported in v1 |

---

## 3 — Design Constraints

- Lower layers never depend on upper layers.
- State machine transitions are the only way to change entity state.
- All transitions emit audit events.
- All transitions write to transactional outbox.
- Founder approval is required for all production-critical actions.

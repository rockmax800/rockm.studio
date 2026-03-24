---
layer: product
criticality: informational
enabled_in_production: no
doc_kind: reference
load_strategy: retrieve
---

# Release Plan

> Product Layer — How releases are structured and shipped.

## 1 — Release Cadence

- **Patch releases**: Bug fixes, shipped as needed.
- **Minor releases**: Feature additions within current architecture (v1.x).
- **Major releases**: Architecture changes or new layers (v2.0).

---

## 2 — Release Gate

Every release must pass:
1. All CI checks green.
2. Staging deployment live and verified.
3. Founder approval for production promotion.
4. Release notes artifact generated.

---

## 3 — Current Release: v1.1

See `roadmap.md` §2 for v1.1 scope.

---

## 4 — Rollback Policy

- Rollback is always possible via the Delivery Lane.
- Rollback creates a new deployment record (does not modify history).
- Founder initiates all rollbacks.

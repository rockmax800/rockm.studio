---
layer: business
criticality: informational
enabled_in_production: yes
---

# Operating Model

> Business Layer — How AI Production Studio operates as a delivery business.

## 1 — Purpose

Defines the operational model for AI Production Studio as a solo-founder, AI-first software delivery system.

---

## 2 — Operating Principles

1. **Founder-controlled**: All critical decisions require founder approval. No autonomous deployment.
2. **AI-executed**: Agents handle implementation, review, and delivery within deterministic boundaries.
3. **Transparent delivery**: Clients see progress via read-only Client Portal.
4. **Budget-aware**: Every run has a cost ceiling; no runaway spending.
5. **Quality-gated**: No artifact ships without review and approval.
6. **Deterministic**: All state transitions follow enforced state machines with guard conditions.

---

## 3 — Operational Flow

```
Client Brief → Intake → Blueprint → Estimate → Launch Decision
    → Project → Tasks → Runs → Artifacts → Reviews → Delivery
```

Each step is tracked in `event_log` with full traceability.

---

## 4 — Founder Role

The founder operates as:
- Product owner (scope decisions)
- Quality gatekeeper (approval authority)
- Budget controller (token and cost limits)
- Release authority (deployment promotion)
- Learning arbiter (approves/rejects improvement proposals)

The founder does NOT:
- Write code
- Configure infrastructure manually
- Manage individual agent assignments (delegated to load balancer)

---

## 5 — Current Operational Status (v1.1)

| Capability | Status |
|-----------|--------|
| Front Office contracts | ✅ Implemented |
| Deterministic delivery pipeline | ✅ Implemented |
| Event log & outbox | ✅ Implemented |
| Sandbox execution | ✅ Implemented |
| Role contracts & TaskSpec | ✅ Implemented |
| Learning pipeline | ✅ Implemented (gated) |
| Revenue tracking | ⬜ Not automated |
| SLA monitoring | ⬜ Not automated |
| Automated invoicing | ⬜ Not implemented |

Revenue, SLA, and invoicing require future automation. Currently tracked manually by founder.

---

## 6 — Operating Modes

| Mode | Description |
|------|-------------|
| **Production (MSOM)** | Default. Only deterministic delivery operates. |
| **Experimental** | Enables shadow testing, A/B, model competition. Founder-controlled. |

See `core/07-system-mode.md`.

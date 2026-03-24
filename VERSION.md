# VERSION

## v1.1 — Spine Stabilized

Released: 2026-03-24

### Summary

Production-grade stabilization of the deterministic execution spine. All core entities, state machines, guards, and delivery pipeline are implemented and enforced. Learning pipeline formalized. Four operational planes defined.

### What's Implemented

- **Deterministic lifecycle** — all entity state transitions enforced through OrchestrationService with optimistic locking and serializable isolation
- **Delivery lane** — Run → RepoWorkspace → PullRequest → CheckSuite → Deployment → DomainBinding
- **Sandbox execution** — Docker-based isolation with configurable CPU, memory, timeout, and network policies
- **Event log** — append-only canonical truth with immutability enforced by database triggers
- **Transactional outbox** — reliable event dispatch with idempotency keys
- **Context reproducibility** — content-hashed context packs for exact run replay
- **Role contracts** — enforceable path boundaries and domain restrictions per agent role
- **TaskSpec** — structured acceptance criteria, verification plans, and allowed paths per task
- **Artifact type system** — 10 typed categories with contract rules and evidence fields
- **Learning pipeline** — formal proposal → evaluation → shadow → approval → promotion workflow
- **Front office contracts** — Intake → Blueprint → Estimate → Launch Decision chain
- **Four operational planes** — Intent, Delivery, Knowledge, Experience with enforced dependency rules

### Production Mode

Production Mode (MSOM) is the system default. All experimental features (prompt A/B, model competition, shadow testing, autonomous execution) are disabled via feature flags.

### What's NOT Implemented

- Automated revenue tracking
- Automated SLA monitoring
- Multi-user collaboration
- Self-service client onboarding
- Fully autonomous operation

### Next Milestone

v1.2 — Delivery Metrics & Governance
- Automated delivery health scoring
- Cost tracking dashboards
- SLA violation detection
- Governance audit reports

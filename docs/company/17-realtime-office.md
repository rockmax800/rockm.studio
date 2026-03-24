---
layer: company
criticality: optional
enabled_in_production: no
doc_kind: reference
load_strategy: retrieve
---

# 17 — Real-Time Office

> Layer 2 — Company Layer
>
> **Disabled in Production Mode.** Active only in Company or Experimental modes.

## 1 — Purpose

Pixel-art visualization of the AI company with agents moving between zones based on task states.

---

## 2 — Zone Mapping

Maps task states (defined in `core/03-state-machine.md` §4) to visual zones:

| Task State | Zone |
|------------|------|
| draft, ready | Planning |
| assigned | Assignment |
| in_progress | Workshop |
| waiting_review | Review |
| rework_required | Rework |
| blocked | Blocked |
| escalated | Escalation |
| approved, done | Completed |

**Does NOT define task states.** Uses existing states from core state machine.

---

## 3 — Office Events

| Field | Type | Notes |
|-------|------|-------|
| entity_type | string | "task" |
| entity_id | uuid | Task ID |
| event_type | string | e.g. "task.assigned_to_in_progress" |
| from_zone | string | Source zone |
| to_zone | string | Target zone |
| actor_role_id | uuid | Agent performing action |

---

## 4 — Visual Elements

- Agent sprites with role labels
- Zone backgrounds
- Movement animations on state transitions
- Badges: "EXPERIMENT" (active prompt experiment), "⭐ TOP" (top performer)
- Copywriter sprite when blog drafts pending
- "📣" badge when posts approved
- System mode indicator (see `07-system-mode.md`)

---

## 5 — Data Source

- `use-office-data.ts` aggregates from multiple tables
- Real-time updates via Supabase Realtime subscriptions
- Performance note: Currently runs 17+ parallel queries — consider consolidation

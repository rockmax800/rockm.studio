# 17 — Real-Time Office

> Layer 2 — Company Layer

## 1 — Purpose

Pixel-art visualization of the AI company with agents moving between zones based on task states.

---

## 2 — Zone Mapping

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

---

## 5 — Data Source

- `use-office-data.ts` aggregates from multiple tables
- Real-time updates via Supabase Realtime subscriptions
- Performance note: Currently runs 17+ parallel queries — consider consolidation

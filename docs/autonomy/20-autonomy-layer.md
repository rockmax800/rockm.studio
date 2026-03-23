# 20 — Autonomy Layer

> Layer 3 — Autonomy & Evolution

## 1 — Purpose

Controlled autonomous operation where the system can generate ideas, create tasks, and execute work within strict budget and approval boundaries.

---

## 2 — Autonomy Pipeline

1. **Idea generation** — System analyzes project state and generates improvement ideas
2. **Task creation** — Ideas become draft tasks (NOT auto-approved)
3. **Execution** — Tasks assigned and runs created within budget
4. **Review** — Standard review pipeline applies
5. **Approval** — Founder approval for anything production-critical

---

## 3 — Autonomy Settings (per project)

| Field | Type | Notes |
|-------|------|-------|
| auto_generate_tasks | boolean | Allow idea → task creation |
| auto_execute_implementation | boolean | Allow auto-execution of created tasks |
| auto_retry_enabled | boolean | Allow automatic retries |
| max_autonomy_depth | integer | How many levels of chained autonomy |
| max_parallel_runs | integer | Concurrent run limit |
| autonomy_token_budget | integer | Token ceiling per autonomy cycle |

---

## 4 — Safety Rules

- All autonomy bounded by token budget
- Max depth prevents infinite chains
- Founder can disable any autonomy setting per project
- Production-critical work always requires founder approval
- Kill switch: set all settings to false/0

---

## 5 — Token Risk

- Single idea can trigger 24–72 LLM calls due to nested chains
- Recommend disabling for daily production use
- Enable only for experimental projects with budget limits

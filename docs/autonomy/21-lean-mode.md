# 21 — Lean Mode

> Layer 3 — Autonomy & Evolution

## 1 — Purpose

Minimal operating configuration that reduces token usage while maintaining core workflow functionality.

---

## 2 — What Lean Mode Disables

- Autonomy pipeline (idea generation, auto-task creation)
- Dual verification (second model check)
- Self-review (agent reviewing own output before submission)
- Context compression (token-saving summarization)
- Bottleneck predictions (periodic analysis)
- Blog auto-drafting

---

## 3 — What Lean Mode Keeps

- Core workflow: Task → Run → Artifact → Review → Approval
- State machine guards
- Orchestration use cases
- Provider routing (primary only, no fallback)
- Activity events
- Basic employee performance tracking

---

## 4 — Activation

Set project autonomy settings:
```
auto_generate_tasks = false
auto_execute_implementation = false
auto_retry_enabled = false
max_autonomy_depth = 0
max_parallel_runs = 1
```

---

## 5 — Expected Token Savings

Estimated 60–80% reduction in token usage compared to full Company + Experimental mode.

---
layer: knowledge
criticality: important
enabled_in_production: yes (creation + evaluation only; shadow requires experimental)
doc_kind: reference
load_strategy: retrieve
---

# Learning Pipeline

> Knowledge Plane — Formal learning & promotion pipeline for continuous improvement.

## 1 — Purpose

Provides a structured, auditable process for proposing, evaluating, and promoting improvements to prompts, skills, policies, and routing. All changes require founder approval and statistical evidence.

**Safety invariant:** The Learning Pipeline NEVER modifies delivery state (tasks, runs, artifacts, deployments). It only proposes and, upon founder approval, promotes Knowledge Plane entities (prompt versions, skills).

---

## 2 — Learning Lifecycle

```
 ┌──────────┐    evaluate    ┌───────────┐    shadow     ┌─────────┐
 │ candidate ├──────────────→│ evaluated  ├─────────────→│ shadow  │
 └──────────┘                └─────┬──────┘              └────┬────┘
                                   │                          │
                          founder  │                  founder │
                          decides  │                  decides │
                                   ▼                          ▼
                            ┌───────────┐            ┌───────────┐
                            │ approved  │            │ approved  │
                            └─────┬─────┘            └─────┬─────┘
                                  │                        │
                            promote│                 promote│
                                  ▼                        ▼
                            ┌───────────┐            ┌───────────┐
                            │ promoted  │            │ promoted  │
                            └───────────┘            └───────────┘

                            ┌───────────┐
                            │ rejected  │ (from evaluated or shadow)
                            └───────────┘
```

### Status transitions

| From | To | Trigger |
|------|----|---------|
| candidate | evaluated | Offline evaluation recorded |
| evaluated | shadow | Shadow mode enabled (experimental only) |
| evaluated | approved | Founder approves |
| shadow | approved | Founder approves |
| evaluated | rejected | Founder rejects |
| shadow | rejected | Founder rejects |
| approved | promoted | Promotion executed |

---

## 3 — Evidence Model

Every learning proposal must include:

### 3.1 — Minimum Evidence (creation)

| Field | Requirement |
|-------|------------|
| `source_runs_json` | Array of ≥ 3 run IDs that motivate the proposal |
| `hypothesis` | Clear statement of what improvement is expected |
| `expected_gain_json` | Measurable expected improvement |
| `baseline_metrics_json` | Current performance metrics |

### 3.2 — Evaluation Evidence (before approval)

| Field | Requirement |
|-------|------------|
| `pass_rate_before` | Success rate on baseline |
| `pass_rate_after` | Success rate with candidate |
| `defect_rate_delta` | Change in defect rate |
| `cost_delta` | Change in token/dollar cost |
| `latency_delta` | Change in execution time |
| `sample_size` | Number of evaluation samples |
| `statistically_significant` | Boolean — must be true for approval |

---

## 4 — Proposal Types

| Type | What changes | Target entity |
|------|-------------|---------------|
| `prompt_update` | System prompt for a role | `prompt_versions` |
| `skill_update` | Skill fragment for a role | `agent_skills` |
| `policy_update` | Execution policy change | Documentation/config |
| `routing_update` | Model routing preference | `model_preference` on role |

---

## 5 — Shadow Mode

Available in **Experimental mode only**. In Production mode, shadow testing is blocked.

Shadow mode:
- Runs the candidate version in parallel with the active version
- Does NOT affect canonical delivery state
- Records comparison metrics in `shadow_comparison_json`
- Provides additional evidence for founder decision

---

## 6 — Promotion Rules

Promotion is allowed only when ALL conditions are met:

| # | Condition |
|---|-----------|
| 1 | Status is `approved` (founder has approved) |
| 2 | `evaluation_result_json` is present |
| 3 | `statistically_significant` is `true` |
| 4 | Improvement is measurable (not just noise) |

### Promotion effects by type

| Type | Action |
|------|--------|
| `prompt_update` | New `prompt_version` set to `is_active = true`, previous deactivated |
| `skill_update` | Skill fragment version incremented |
| `policy_update` | Policy document updated (manual) |
| `routing_update` | Role `model_preference` updated |

---

## 7 — Event Log Integration

All lifecycle transitions emit events to `event_log`:

| Event | Trigger |
|-------|---------|
| `learning_proposal.created` | New proposal created |
| `learning_proposal.evaluated` | Evaluation recorded |
| `learning_proposal.shadow_started` | Shadow mode enabled |
| `learning_proposal.approved` | Founder approved |
| `learning_proposal.rejected` | Founder rejected |
| `learning_proposal.promoted` | Promotion executed |

---

## 8 — Safety Rules

The Learning Pipeline is a Knowledge Plane entity. It MUST NOT:

| Forbidden Action | Reason |
|-----------------|--------|
| Change task state | Delivery Plane only |
| Reassign roles | Delivery Plane only |
| Deploy code | Delivery Plane only |
| Bypass approval gates | Founder control required |
| Auto-promote without approval | Safety constraint |
| Modify artifacts | Delivery Plane only |
| Create runs | Delivery Plane only |

---

## 9 — Separation from Delivery

```
DELIVERY PLANE                    KNOWLEDGE PLANE
     │                                 │
     │  run results ──────────────→    │ analyzes
     │  artifact quality ─────────→    │ scores
     │                                 │
     │                                 │ creates learning_proposal
     │                                 │ evaluates offline
     │                                 │ (optional) shadow tests
     │                                 │
     │                                 │ → founder approves/rejects
     │                                 │
     │  ←── promoted version ────────  │ promotes (prompt_version only)
     │                                 │
```

The ONLY write-back from Knowledge to Delivery-adjacent entities is the promotion of `prompt_versions.is_active` — and this requires explicit founder approval.

---

## 10 — Relationship to Other Documents

| Document | Relationship |
|----------|-------------|
| `core/13-operational-planes.md` | Learning Pipeline lives in Knowledge Plane |
| `core/12-event-log-architecture.md` | All transitions emit events |
| `autonomy/22-prompt-versioning.md` | Prompt versions are the primary promotion target |
| `autonomy/23-model-competition.md` | Model benchmarks feed evaluation evidence |
| `core/07-system-mode.md` | Shadow mode requires Experimental mode |

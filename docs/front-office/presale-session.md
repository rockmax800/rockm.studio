---
layer: front-office
criticality: optional
enabled_in_production: yes
doc_kind: reference
load_strategy: retrieve
---

# Presale Session

> Front Office — Lightweight pre-engagement scoping.

## 1 — Purpose

A simplified intake flow for quick client conversations before formal IntakeRequest creation. Captures brief, generates spec, estimates cost, and optionally converts to a full project.

---

## 2 — Entity Fields

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| client_name | string | |
| client_brief | text | Raw client input |
| department_slug | string | Target department |
| spec_content | text | Generated specification |
| risk_level | string | low / medium / high |
| risk_notes | text | |
| estimate_tokens_min | integer | |
| estimate_tokens_avg | integer | |
| estimate_tokens_max | integer | |
| estimate_cost_min | numeric | |
| estimate_cost_max | numeric | |
| estimate_timeline_days | integer | |
| blueprint_id | uuid | Nullable — linked blueprint |
| converted_project_id | uuid | Nullable — if converted |
| status | string | draft → estimated → converted / archived |
| created_at | timestamp | |
| updated_at | timestamp | |

---

## 3 — Rules

- Presale sessions are optional — not all projects go through presale.
- Conversion to project follows the standard LaunchDecision gate.
- Presale data is preserved for audit even after conversion.

---

## 4 — Planning Package Integration (v2.1)

When a presale session converts to a full IntakeRequest, the **Company Lead Planning Package v2.1** applies. The presale brief feeds into the Clarification Loop as initial input, but does not bypass any planning phase.

See `company-lead-planning-package.md` for the mandatory phase sequence.

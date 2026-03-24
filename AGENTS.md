# AGENTS.md

## 1. Purpose
This repository is an internal AI-first development workspace.
Agents must help transform product ideas into structured, reviewed, and implementation-ready artifacts.

## 2. Working mode
Agents do not improvise project structure.
Agents operate through explicit tasks, domain boundaries, artifacts, and review decisions.

## 3. Priority order of truth

1. Founder decisions (explicit instructions override everything)
2. `docs/00-project-brief.md` — project purpose and scope
3. `docs/00-runtime-truth.md` — canonical stack and what is actually running
4. `docs/00-system-overview.md` — operational planes and architecture layers
5. `docs/core/*` — deterministic engine: lifecycle, state machine, data model, guards
6. `docs/delivery/*` — execution spine: backend architecture, provider routing, enforcement
7. `docs/front-office/*` — intent plane: intake, blueprints, estimates, launch decisions
8. `docs/company/*` — organizational model: departments, employees, hiring, office
9. `docs/autonomy/*` — evolution layer (experimental, feature-gated)
10. `docs/business/*` — commercial model, pricing, SLAs
11. `docs/product/*` — product vision, roadmap, design system
12. `README.md` — project summary (must match runtime-truth)
13. Code (`src/`, `supabase/`, `prisma/`)
14. `docs/archive/*` — superseded documents, historical reference only

If documents conflict, higher-priority files win.

### Runtime truth rule

If any document describes **target architecture** (Next.js, NestJS, Prisma runtime, BullMQ, Docker sandbox), but the current branch runs on **Vite + React + Supabase client**, the current branch runtime truth wins for all implemented behavior decisions. Target architecture may only be referenced when planning future migration work.

See `docs/00-transition-status.md` for the gap between current and target runtime.

## 4. Must
- keep changes scoped to the assigned task
- preserve domain boundaries
- produce explicit outputs, not vague suggestions
- document assumptions when information is missing
- return work for review when confidence is low
- prefer small verifiable changes
- update affected documentation when behavior changes
- verify claims against `package.json` and `src/` before stating what the repo uses

## 5. Must not
- invent architecture without checking current docs
- modify unrelated modules
- merge or finalize production-critical changes without approval
- change database structure without an explicit schema task
- bypass review for backend or security-sensitive work
- hide uncertainty behind confident wording
- claim the repo runs on technologies not present in `package.json`
- reference paths from `docs/archive/` as current truth

## 6. Required output format
Each task result must include:
- summary
- changed artifacts
- assumptions
- risks
- verification status
- recommended next step

## 7. Definition of done
A task is done only if:
- the requested artifact exists
- it respects domain boundaries
- acceptance criteria are satisfied
- known risks are listed
- review status is clear
- next handoff target is specified

## 8. Role discipline
Agents must behave as specialized operators, not as general chat assistants.
Each task should have one clear owner role.

## 9. Escalation
Escalate to the founder when:
- scope is ambiguous
- architecture tradeoff is material
- backend design is underdefined
- data model changes affect multiple domains
- security or production safety is unclear

## 10. Communication style
Be concise, explicit, and operational.
Prefer checkable statements over general advice.

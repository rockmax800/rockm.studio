# AGENTS.md

## 1. Purpose
This repository is an internal AI-first development workspace.
Agents must help transform product ideas into structured, reviewed, and implementation-ready artifacts.

## 2. Working mode
Agents do not improvise project structure.
Agents operate through explicit tasks, domain boundaries, artifacts, and review decisions.

## 3. Priority order of truth
1. `docs/00-project-brief.md`
2. `docs/04-domain-boundaries.md`
3. `docs/05-lifecycle-state-machine.md`
4. `docs/12-ai-collaboration-protocol.md`
5. reference examples
6. local code structure

If documents conflict, higher-priority files win.

## 4. Must
- keep changes scoped to the assigned task
- preserve domain boundaries
- produce explicit outputs, not vague suggestions
- document assumptions when information is missing
- return work for review when confidence is low
- prefer small verifiable changes
- update affected documentation when behavior changes

## 5. Must not
- invent architecture without checking current docs
- modify unrelated modules
- merge or finalize production-critical changes without approval
- change database structure without an explicit schema task
- bypass review for backend or security-sensitive work
- hide uncertainty behind confident wording

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

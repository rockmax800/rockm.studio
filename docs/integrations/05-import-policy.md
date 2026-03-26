---
doc_kind: policy
layer: integrations
criticality: high
version: v1.0
---

# 05 — External Concept Import Policy

> Status: **Active** · Owner: System layer · Last updated: 2025-01-20

## Purpose

This document defines how concepts, patterns, or code from external agent-harness repositories may be adopted into this product. It ensures no runtime or build-time dependency on external GitHub repositories.

## Hard Rules

| # | Rule |
|---|------|
| 1 | **External repos are references, not dependencies.** No `import`, `fetch`, `git submodule`, or URL reference to an external repo may exist in runtime or build code. |
| 2 | **Adopted concepts must be rewritten locally.** Ideas from external projects are implemented as local docs, configs, types, or services under this product's naming conventions. |
| 3 | **No hidden URL reliance.** No source file may depend on the availability of an external GitHub URL to function correctly. |
| 4 | **No wholesale structure copying.** Directory layouts, file naming schemes, and config formats from external repos must be adapted to fit this product's existing structure. |
| 5 | **Attribution required for copied code.** If actual source code (not just concepts) is adapted, it must be attributed in `THIRD_PARTY_NOTICES.md` with license and origin. |
| 6 | **Agents must not fetch external repos.** AI coding agents working on this repo must implement local equivalents from descriptions, not by cloning or reading external repositories. |

## Adoption Workflow

1. **Identify concept** — Document what the external pattern does and why it is useful.
2. **Map to local domain** — Determine where it fits: `docs/`, `src/config/`, `src/types/`, `src/services/`, or `src/components/`.
3. **Rewrite with neutral naming** — Use product-native terminology, not the external project's branding.
4. **Attribute if code is copied** — Add an entry to `THIRD_PARTY_NOTICES.md`.
5. **Review** — Founder approval required before the concept is wired into execution.

## What Counts as "Adoption"

| Action | Allowed | Requires Attribution |
|--------|---------|---------------------|
| Reading external docs for inspiration | ✓ | No |
| Reimplementing a concept locally | ✓ | No |
| Adapting code snippets (modified) | ✓ | Yes |
| Copying code verbatim | ✓ | Yes, with license |
| Adding external repo as dependency | ✗ | — |
| Fetching external repo at build/runtime | ✗ | — |
| Referencing external URLs in source | ✗ | — |

## Existing Adoptions

See `docs/integrations/02-agent-harness-patterns-adoption.md` for the current list of adopted concepts and their local implementations.

## Related Documents

| Document | Relationship |
|----------|-------------|
| `THIRD_PARTY_NOTICES.md` | Attribution records |
| `docs/integrations/02-agent-harness-patterns-adoption.md` | Adopted pattern registry |
| `docs/integrations/04-harness-interop.md` | Execution environment boundaries |

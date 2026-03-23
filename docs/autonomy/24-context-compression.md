---
layer: autonomy
criticality: experimental
enabled_in_production: no
---

# 24 — Context Compression

> Layer 3 — Autonomy & Evolution
>
> **Disabled in Production Mode.** Requires `enable_context_compression` feature flag. See `08-feature-flags.md`.

## 1 — Purpose

Token-efficient context assembly using AI summarization to reduce input size for runs.

---

## 2 — When Used

- Context pack exceeds token threshold (configurable)
- Enabled via `enable_context_compression` feature flag
- Skipped in production mode

---

## 3 — Compression Strategy

1. Identify largest documents in context pack
2. Generate summaries via lightweight model call
3. Replace full documents with summaries
4. Preserve critical sections (acceptance criteria, constraints)
5. Store compression metadata in `context_snapshots` for audit

---

## 4 — Token Cost

- Compression itself costs tokens (summary generation)
- Net savings only realized for large context packs (>8k tokens)
- For small contexts, compression adds cost — skip it
- See `28-token-economy-and-budgeting.md` for cost analysis

---

## 5 — Safety

- Original context always preserved
- Compressed version is supplementary, not replacement
- Founder can disable per project via feature flag

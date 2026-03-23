# 24 — Context Compression

> Layer 3 — Autonomy & Evolution

## 1 — Purpose

Token-efficient context assembly that summarizes large context packs before sending to provider.

---

## 2 — When Used

- Context pack exceeds token threshold (configurable)
- Enabled via `ContextCompressionService`
- Optional — can be disabled in Lean Mode

---

## 3 — Compression Strategy

1. Identify largest documents in context pack
2. Generate summaries via lightweight model call
3. Replace full documents with summaries
4. Preserve critical sections (acceptance criteria, constraints)
5. Store compression metadata for audit

---

## 4 — Token Cost

- Compression itself costs tokens (summary generation)
- Net savings only realized for large context packs (>8k tokens)
- For small contexts, compression adds cost — skip it

---

## 5 — Recommendation

Disable in Lean Mode. Enable only when projects have large document sets.

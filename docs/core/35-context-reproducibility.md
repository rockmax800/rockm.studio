---
layer: core
criticality: critical
enabled_in_production: yes
---

# 35 — Context Reproducibility

> Layer 1 — Core Engine
>
> Ensures every Run is reproducible by freezing the exact context provided to the agent.

## 1 — Purpose

When a Run executes, the agent receives a context pack containing documents, artifacts, prompt templates, and skills. If any of these inputs change after execution, the system must still be able to reconstruct what the agent actually received. This spec defines how context is frozen, hashed, and verified.

---

## 2 — Why Snapshot Required

| Problem | Consequence without snapshot |
|---------|------------------------------|
| Document edited after run | Cannot verify what agent was told |
| Artifact superseded | Original reasoning lost |
| Prompt version updated | Cannot reproduce behavior |
| Skill pack changed | Different capabilities assumed |
| Audit request | No proof of what agent saw |
| Debugging failed run | Cannot distinguish agent error from context error |

---

## 3 — Extended ContextPack Fields

| Field | Type | Purpose |
|-------|------|---------|
| context_manifest_json | jsonb | Full frozen snapshot of all inputs |
| context_hash | text | SHA-256 hash of manifest for integrity |
| source_versions_json | jsonb | Index of document/artifact versions |
| assembled_at | timestamptz | When snapshot was created |
| assembled_by | text | system, founder, or role code |
| prompt_version_ref | uuid FK | Exact prompt version used |
| skill_pack_version_ref | text | Skill pack version identifier |

All fields are nullable and additive — existing ContextPacks without snapshots remain valid.

---

## 4 — What Is Frozen

### 4.1 Documents

| Condition | Frozen data |
|-----------|-------------|
| Document has `version_label` | Record version_label (content retrievable by version) |
| Document has no `version_label` | Snapshot full `content_markdown` into manifest |

### 4.2 Artifacts

Always snapshot:
- `content_text` (full content at time of assembly)
- `summary`
- `version` number
- `state` at assembly time
- `storage_kind`, `file_path`, `external_ref`

If artifact content changes later, the Run still references the original frozen content.

### 4.3 Prompt Version

Record `prompt_version_ref` (FK to `prompt_versions.id`) — the exact prompt template used.

### 4.4 Skill Pack

Record `skill_pack_version_ref` — version identifier for the skill fragment set active at assembly time.

---

## 5 — Assembly Flow

```
Run enters "preparing"
         ↓
ContextSnapshotService.assembleSnapshot()
         ↓
  ┌─ Resolve included_document_ids → freeze content/version
  ├─ Resolve included_artifact_ids → freeze content
  ├─ Record prompt_version_ref
  ├─ Record skill_pack_version_ref
  ├─ Record file_paths, assumptions, summary
  └─ Build context_manifest_json
         ↓
  Compute context_hash = SHA-256(manifest)
         ↓
  Store: context_manifest_json, context_hash,
         source_versions_json, assembled_at, assembled_by
         ↓
  Run proceeds to "running"
```

---

## 6 — Reproducibility Guarantee

Given a Run ID, the system can reconstruct:

| Component | Source |
|-----------|--------|
| Full prompt | context_pack.prompt_version_ref → prompt_versions.full_prompt |
| Full context | context_pack.context_manifest_json (documents + artifacts) |
| Model used | run.provider_id + run.provider_model_id |
| Skill pack | context_pack.skill_pack_version_ref |
| Sandbox policy | run.sandbox_policy_id |
| Exact inputs hash | context_pack.context_hash |

---

## 7 — Integrity Verification

`ContextSnapshotService.verifyIntegrity(contextPackId)`:

1. Read stored `context_manifest_json`
2. Recompute SHA-256 hash
3. Compare with stored `context_hash`
4. Return `{ valid: boolean, storedHash, computedHash }`

If hashes diverge, the manifest was tampered with or corrupted.

---

## 8 — Source Versions Index

`source_versions_json` provides a quick lookup without parsing the full manifest:

```json
{
  "documents": [
    { "id": "uuid", "version_label": "v1.2", "has_content_snapshot": false },
    { "id": "uuid", "version_label": null, "has_content_snapshot": true }
  ],
  "artifacts": [
    { "id": "uuid", "version": 3, "has_content_snapshot": true }
  ],
  "prompt_version_ref": "uuid",
  "skill_pack_version_ref": "v2.1"
}
```

---

## 9 — Backward Compatibility

- All new fields are nullable
- Existing ContextPacks without snapshots remain valid
- No destructive migration
- Assembly is additive — called during Run preparation
- Systems that don't call `assembleSnapshot` still function normally

---

## 10 — Security

- Manifest is immutable once assembled (no update path exposed)
- Hash provides tamper detection
- Content snapshots may contain sensitive data — same access controls as ContextPack

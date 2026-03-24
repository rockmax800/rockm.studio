
-- Extend context_packs with snapshot/reproducibility fields (additive, non-destructive)
ALTER TABLE public.context_packs
  ADD COLUMN IF NOT EXISTS context_manifest_json jsonb,
  ADD COLUMN IF NOT EXISTS context_hash text,
  ADD COLUMN IF NOT EXISTS source_versions_json jsonb,
  ADD COLUMN IF NOT EXISTS assembled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS assembled_by text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS prompt_version_ref uuid REFERENCES public.prompt_versions(id),
  ADD COLUMN IF NOT EXISTS skill_pack_version_ref text;

-- Index for hash lookups
CREATE INDEX IF NOT EXISTS idx_context_packs_hash ON public.context_packs(context_hash);

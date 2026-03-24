
-- Artifact Evidence Fields (v3.0)
-- Additive only — no columns removed, no NOT NULL on new fields

-- Source entity traceability
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS source_entity_type text;
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS source_entity_id uuid;

-- Delivery spine cross-references
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS related_repo_workspace_id uuid REFERENCES public.repo_workspaces(id);
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS related_pull_request_id uuid REFERENCES public.pull_requests(id);
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS related_check_suite_id uuid REFERENCES public.check_suites(id);
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS related_deployment_id uuid REFERENCES public.deployments(id);

-- Evidence payloads
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS changed_files_json jsonb;
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS tests_executed_json jsonb;

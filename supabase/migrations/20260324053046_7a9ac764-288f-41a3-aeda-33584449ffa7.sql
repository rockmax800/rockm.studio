
-- Run Execution Trace: extend runs table with execution context fields
-- All new fields nullable — existing runs remain valid

-- Execution Context
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES public.providers(id);
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS provider_model_id uuid REFERENCES public.provider_models(id);
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS prompt_version_ref uuid REFERENCES public.prompt_versions(id);
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS skill_pack_version_ref text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS tool_policy_ref text;

-- Workspace & Code
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.repo_workspaces(id);
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS branch_name text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS commit_sha text;

-- Execution Control
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS lease_owner text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS retry_class text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS error_class text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS exit_code integer;

-- Cost & Usage
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS input_tokens integer;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS output_tokens integer;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS estimated_cost numeric;

-- Observability
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS logs_ref text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS correlation_id uuid;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS causation_id uuid;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Index for stalled detection
CREATE INDEX IF NOT EXISTS idx_runs_heartbeat ON public.runs(heartbeat_at) WHERE state = 'running';
-- Index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_idempotency ON public.runs(idempotency_key) WHERE idempotency_key IS NOT NULL;
-- Index for correlation tracing
CREATE INDEX IF NOT EXISTS idx_runs_correlation ON public.runs(correlation_id) WHERE correlation_id IS NOT NULL;

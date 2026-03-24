
-- Role Contracts: enforceable boundaries for each agent role
CREATE TABLE public.role_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code text NOT NULL,
  allowed_repo_paths_json jsonb DEFAULT '[]'::jsonb,
  forbidden_repo_paths_json jsonb DEFAULT '[]'::jsonb,
  allowed_task_domains_json jsonb DEFAULT '[]'::jsonb,
  required_artifacts_json jsonb DEFAULT '[]'::jsonb,
  required_verification_steps_json jsonb DEFAULT '[]'::jsonb,
  risk_threshold numeric NOT NULL DEFAULT 0.5,
  may_deploy boolean NOT NULL DEFAULT false,
  may_merge boolean NOT NULL DEFAULT false,
  may_modify_schema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to role_contracts" ON public.role_contracts FOR ALL TO public USING (true) WITH CHECK (true);

-- Link agent_roles to role_contracts
ALTER TABLE public.agent_roles ADD COLUMN role_contract_id uuid REFERENCES public.role_contracts(id);

-- TaskSpec: structured specification for every implementation task
CREATE TABLE public.task_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  goal text NOT NULL DEFAULT '',
  target_repository text,
  allowed_repo_paths_json jsonb DEFAULT '[]'::jsonb,
  forbidden_repo_paths_json jsonb DEFAULT '[]'::jsonb,
  acceptance_criteria_json jsonb DEFAULT '[]'::jsonb,
  verification_plan_json jsonb DEFAULT '[]'::jsonb,
  risk_class text NOT NULL DEFAULT 'low',
  requested_outcome text,
  required_artifacts_json jsonb DEFAULT '[]'::jsonb,
  definition_of_done_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id)
);

ALTER TABLE public.task_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to task_specs" ON public.task_specs FOR ALL TO public USING (true) WITH CHECK (true);

-- Artifact category: structured classification beyond generic types
ALTER TABLE public.artifacts ADD COLUMN artifact_category text;


-- PART 1: Prompt Versions
CREATE TABLE IF NOT EXISTS public.prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.agent_roles(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  full_prompt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'system',
  performance_snapshot jsonb DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT false,
  UNIQUE (role_id, version_number)
);
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to prompt_versions" ON public.prompt_versions FOR ALL TO public USING (true) WITH CHECK (true);

-- PART 3: Prompt Experiments
CREATE TABLE IF NOT EXISTS public.prompt_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.agent_roles(id) ON DELETE CASCADE,
  base_version_id uuid NOT NULL REFERENCES public.prompt_versions(id) ON DELETE CASCADE,
  experimental_version_id uuid NOT NULL REFERENCES public.prompt_versions(id) ON DELETE CASCADE,
  traffic_percentage integer NOT NULL DEFAULT 10,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz DEFAULT NULL,
  performance_delta jsonb DEFAULT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prompt_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to prompt_experiments" ON public.prompt_experiments FOR ALL TO public USING (true) WITH CHECK (true);

-- PART 5: Prompt Improvement Suggestions
CREATE TABLE IF NOT EXISTS public.prompt_improvement_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.agent_roles(id) ON DELETE CASCADE,
  current_version_id uuid REFERENCES public.prompt_versions(id) ON DELETE SET NULL,
  suggested_prompt text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved boolean NOT NULL DEFAULT false,
  approved_at timestamptz DEFAULT NULL,
  resulting_version_id uuid REFERENCES public.prompt_versions(id) ON DELETE SET NULL
);
ALTER TABLE public.prompt_improvement_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to prompt_improvement_suggestions" ON public.prompt_improvement_suggestions FOR ALL TO public USING (true) WITH CHECK (true);

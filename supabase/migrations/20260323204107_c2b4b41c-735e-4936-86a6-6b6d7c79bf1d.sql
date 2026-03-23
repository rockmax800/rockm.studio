
-- PART 1: Teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  focus_domain text NOT NULL DEFAULT 'mixed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to teams"
  ON public.teams FOR ALL TO public
  USING (true) WITH CHECK (true);

-- PART 1: Extend agent_roles
ALTER TABLE public.agent_roles
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS capacity_score integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_parallel_tasks integer NOT NULL DEFAULT 2;

-- PART 6: Company mode settings
CREATE TABLE public.company_mode_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_multi_team boolean NOT NULL DEFAULT false,
  max_parallel_projects integer NOT NULL DEFAULT 3,
  cross_team_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_mode_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to company_mode_settings"
  ON public.company_mode_settings FOR ALL TO public
  USING (true) WITH CHECK (true);

-- PART 6: Projects can be assigned to teams
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

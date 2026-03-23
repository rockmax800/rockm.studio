
-- PART 1: AI Employees table
CREATE TABLE public.ai_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  role_id uuid REFERENCES public.agent_roles(id) ON DELETE SET NULL,
  role_code text NOT NULL,
  provider text,
  model_name text,
  prompt_version_id uuid REFERENCES public.prompt_versions(id) ON DELETE SET NULL,
  hired_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  success_rate double precision NOT NULL DEFAULT 0,
  avg_cost double precision NOT NULL DEFAULT 0,
  avg_latency double precision NOT NULL DEFAULT 0,
  bug_rate double precision NOT NULL DEFAULT 0,
  escalation_rate double precision NOT NULL DEFAULT 0,
  reputation_score double precision NOT NULL DEFAULT 0,
  last_evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to ai_employees"
  ON public.ai_employees FOR ALL TO public
  USING (true) WITH CHECK (true);

-- PART 4: HR Suggestions table
CREATE TABLE public.hr_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL,
  reason text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to hr_suggestions"
  ON public.hr_suggestions FOR ALL TO public
  USING (true) WITH CHECK (true);


-- PART 1: Extend agent_roles with meta fields
ALTER TABLE public.agent_roles ADD COLUMN IF NOT EXISTS prompt_template text;
ALTER TABLE public.agent_roles ADD COLUMN IF NOT EXISTS skill_profile jsonb;
ALTER TABLE public.agent_roles ADD COLUMN IF NOT EXISTS model_preference jsonb;
ALTER TABLE public.agent_roles ADD COLUMN IF NOT EXISTS performance_score double precision NOT NULL DEFAULT 0;
ALTER TABLE public.agent_roles ADD COLUMN IF NOT EXISTS total_runs integer NOT NULL DEFAULT 0;
ALTER TABLE public.agent_roles ADD COLUMN IF NOT EXISTS success_rate double precision NOT NULL DEFAULT 0;

-- PART 2: Create agent_skills table
CREATE TABLE IF NOT EXISTS public.agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.agent_roles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  prompt_fragment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to agent_skills" ON public.agent_skills FOR ALL TO public USING (true) WITH CHECK (true);

-- PART 3: Create run_evaluations table
CREATE TABLE IF NOT EXISTS public.run_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.agent_roles(id) ON DELETE SET NULL,
  quality_score double precision NOT NULL DEFAULT 0,
  cost_score double precision NOT NULL DEFAULT 0,
  latency_ms integer,
  review_outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.run_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to run_evaluations" ON public.run_evaluations FOR ALL TO public USING (true) WITH CHECK (true);

-- PART 4: Create office_events table
CREATE TABLE IF NOT EXISTS public.office_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  from_zone text,
  to_zone text,
  actor_role_id uuid REFERENCES public.agent_roles(id) ON DELETE SET NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.office_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to office_events" ON public.office_events FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable realtime for office_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.office_events;

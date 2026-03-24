
-- Evaluation Suites
CREATE TABLE public.evaluation_suites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  suite_type TEXT NOT NULL DEFAULT 'implementation',
  protected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_suite_type CHECK (suite_type IN ('architecture', 'implementation', 'qa', 'release', 'learning'))
);

-- Evaluation Scenarios
CREATE TABLE public.evaluation_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suite_id UUID NOT NULL REFERENCES public.evaluation_suites(id),
  scenario_name TEXT NOT NULL,
  scenario_description TEXT NOT NULL DEFAULT '',
  input_fixture_ref TEXT,
  expected_outcome_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  critical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Extend evaluation_runs with suite_id, pass_rate, failed_scenarios
ALTER TABLE public.evaluation_runs
  ADD COLUMN IF NOT EXISTS suite_id UUID REFERENCES public.evaluation_suites(id),
  ADD COLUMN IF NOT EXISTS pass_rate DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS failed_scenarios_json JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS related_run_id UUID;

-- Evaluation Reports
CREATE TABLE public.evaluation_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  baseline_comparison_json JSONB,
  protected_scenarios_passed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_eval_target_type CHECK (target_type IN ('run', 'learning_proposal', 'deployment'))
);

-- Evaluation Baselines
CREATE TABLE public.evaluation_baselines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suite_id UUID NOT NULL REFERENCES public.evaluation_suites(id) UNIQUE,
  baseline_metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_eval_scenarios_suite ON public.evaluation_scenarios(suite_id);
CREATE INDEX idx_eval_runs_suite ON public.evaluation_runs(suite_id);
CREATE INDEX idx_eval_reports_target ON public.evaluation_reports(target_type, target_id);
CREATE INDEX idx_eval_baselines_suite ON public.evaluation_baselines(suite_id);

-- RLS
ALTER TABLE public.evaluation_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to evaluation_suites" ON public.evaluation_suites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to evaluation_scenarios" ON public.evaluation_scenarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to evaluation_reports" ON public.evaluation_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to evaluation_baselines" ON public.evaluation_baselines FOR ALL USING (true) WITH CHECK (true);

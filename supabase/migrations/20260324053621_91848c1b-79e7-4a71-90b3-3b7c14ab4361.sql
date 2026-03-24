
-- Front Office entities: IntakeRequest, BlueprintContract, EstimateReport, LaunchDecision

-- Intake Request
CREATE TABLE public.intake_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id),
  client_name text NOT NULL DEFAULT '',
  business_goal text NOT NULL DEFAULT '',
  target_users_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  constraints_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  non_goals_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  success_metrics_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_class text NOT NULL DEFAULT 'low',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to intake_requests" ON public.intake_requests FOR ALL USING (true) WITH CHECK (true);

-- Blueprint Contract
CREATE TABLE public.blueprint_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_request_id uuid NOT NULL REFERENCES public.intake_requests(id),
  scope_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  out_of_scope_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  acceptance_criteria_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_decisions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  effort_band text NOT NULL DEFAULT 'medium',
  critical_risks_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_by_founder boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blueprint_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to blueprint_contracts" ON public.blueprint_contracts FOR ALL USING (true) WITH CHECK (true);

-- Estimate Report
CREATE TABLE public.estimate_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_contract_id uuid NOT NULL REFERENCES public.blueprint_contracts(id),
  min_token_estimate integer NOT NULL DEFAULT 0,
  avg_token_estimate integer NOT NULL DEFAULT 0,
  worst_case_token_estimate integer NOT NULL DEFAULT 0,
  min_cost_estimate numeric NOT NULL DEFAULT 0,
  avg_cost_estimate numeric NOT NULL DEFAULT 0,
  worst_case_cost_estimate numeric NOT NULL DEFAULT 0,
  timeline_days_estimate integer NOT NULL DEFAULT 0,
  risk_notes_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_by_founder boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estimate_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to estimate_reports" ON public.estimate_reports FOR ALL USING (true) WITH CHECK (true);

-- Launch Decision
CREATE TABLE public.launch_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_report_id uuid NOT NULL REFERENCES public.estimate_reports(id),
  decision text NOT NULL DEFAULT 'deferred',
  founder_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.launch_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to launch_decisions" ON public.launch_decisions FOR ALL USING (true) WITH CHECK (true);

-- FK references on projects table for traceability
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS intake_request_id uuid REFERENCES public.intake_requests(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS blueprint_contract_id uuid REFERENCES public.blueprint_contracts(id);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimate_report_id uuid REFERENCES public.estimate_reports(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blueprint_intake ON public.blueprint_contracts(intake_request_id);
CREATE INDEX IF NOT EXISTS idx_estimate_blueprint ON public.estimate_reports(blueprint_contract_id);
CREATE INDEX IF NOT EXISTS idx_launch_estimate ON public.launch_decisions(estimate_report_id);

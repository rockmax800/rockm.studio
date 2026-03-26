
-- CTO Clarification Requests — Intent Plane artifact
-- CTO may request clarification but never mutate approved scope.
CREATE TABLE public.cto_clarification_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  blueprint_contract_id uuid REFERENCES public.blueprint_contracts(id),
  affected_module_id text NOT NULL,
  affected_module_name text NOT NULL,
  ambiguity_description text NOT NULL DEFAULT '',
  requested_clarification text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  resolver_note text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cto_clarification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to cto_clarification_requests"
  ON public.cto_clarification_requests
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_cto_clarification_requests_updated_at
  BEFORE UPDATE ON public.cto_clarification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CTO Sanity Reports — pre-materialization validation snapshots
CREATE TABLE public.cto_sanity_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  blueprint_contract_id uuid REFERENCES public.blueprint_contracts(id),
  overall_status text NOT NULL DEFAULT 'valid',
  total_drafts integer NOT NULL DEFAULT 0,
  valid_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  blocked_count integer NOT NULL DEFAULT 0,
  issues_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  materialization_allowed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cto_sanity_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to cto_sanity_reports"
  ON public.cto_sanity_reports
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

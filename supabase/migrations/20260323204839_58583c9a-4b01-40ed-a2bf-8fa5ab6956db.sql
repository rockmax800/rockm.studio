
CREATE TABLE public.candidate_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  suggested_provider text,
  suggested_model text,
  suggested_prompt_version_id uuid REFERENCES public.prompt_versions(id) ON DELETE SET NULL,
  projected_success_rate double precision NOT NULL DEFAULT 0,
  projected_cost double precision NOT NULL DEFAULT 0,
  projected_latency double precision NOT NULL DEFAULT 0,
  reason text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  executed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to candidate_proposals"
  ON public.candidate_proposals FOR ALL TO public
  USING (true) WITH CHECK (true);

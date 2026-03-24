-- PART 1: Extend approval enums for blueprint/estimate approval
ALTER TYPE public.approval_target_type ADD VALUE IF NOT EXISTS 'blueprint_contract';
ALTER TYPE public.approval_target_type ADD VALUE IF NOT EXISTS 'estimate_report';
ALTER TYPE public.approval_type ADD VALUE IF NOT EXISTS 'blueprint_approval';
ALTER TYPE public.approval_type ADD VALUE IF NOT EXISTS 'estimate_approval';
ALTER TYPE public.approval_type ADD VALUE IF NOT EXISTS 'learning_promotion';

-- PART 2: Create evaluation_runs table (Knowledge Plane, isolated from Delivery)
CREATE TABLE public.evaluation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learning_proposal_id UUID NOT NULL REFERENCES public.learning_proposals(id),
  base_run_id UUID,
  candidate_version_ref UUID,
  context_snapshot_ref UUID,
  result_metrics_json JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'created',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to evaluation_runs" ON public.evaluation_runs FOR ALL USING (true) WITH CHECK (true);
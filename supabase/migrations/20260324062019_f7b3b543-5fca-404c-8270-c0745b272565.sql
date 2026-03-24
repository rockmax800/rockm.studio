
-- Learning Proposals — Knowledge Plane entity
-- Formal pipeline for prompt/skill/policy/routing improvements
-- Never modifies delivery state directly

CREATE TABLE public.learning_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_type text NOT NULL CHECK (proposal_type IN ('prompt_update', 'skill_update', 'policy_update', 'routing_update')),
  source_runs_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  hypothesis text NOT NULL DEFAULT '',
  expected_gain_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  baseline_metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  candidate_version_ref uuid,
  evaluation_result_json jsonb,
  shadow_comparison_json jsonb,
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'evaluated', 'shadow', 'approved', 'rejected', 'promoted')),
  rejection_reason text,
  promoted_version_ref uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  evaluated_at timestamp with time zone,
  approved_at timestamp with time zone,
  promoted_at timestamp with time zone
);

-- Indexes
CREATE INDEX idx_learning_proposals_status ON public.learning_proposals (status);
CREATE INDEX idx_learning_proposals_type ON public.learning_proposals (proposal_type);
CREATE INDEX idx_learning_proposals_created ON public.learning_proposals (created_at);

-- RLS
ALTER TABLE public.learning_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to learning_proposals"
  ON public.learning_proposals FOR ALL TO public
  USING (true) WITH CHECK (true);

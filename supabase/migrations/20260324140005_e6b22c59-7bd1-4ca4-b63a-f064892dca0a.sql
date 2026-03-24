
-- ═══════════════════════════════════════════════════════════
-- EVOLUTION LAYER — DATA MODEL
-- Gödel Mode, Darwin Mode, Cybernetic Loop, Capability Templates
-- ═══════════════════════════════════════════════════════════

-- 1) Enums
CREATE TYPE public.evolution_target_component AS ENUM (
  'prompt', 'rubric', 'guard', 'contract', 'retrieval_rule', 'trait', 'stack', 'routing'
);

CREATE TYPE public.self_mod_status AS ENUM (
  'candidate', 'evaluated', 'approved', 'rejected', 'promoted'
);

CREATE TYPE public.mutation_type AS ENUM (
  'prompt_tweak', 'trait_shift', 'stack_change', 'routing_change'
);

CREATE TYPE public.mutation_status AS ENUM (
  'running', 'survived', 'rejected'
);

CREATE TYPE public.correction_status AS ENUM (
  'proposed', 'acknowledged', 'applied', 'dismissed'
);

-- 2) Self-Modification Proposals (Gödel Mode)
CREATE TABLE public.self_modification_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_component public.evolution_target_component NOT NULL,
  target_entity_id TEXT,
  current_version TEXT NOT NULL DEFAULT '1.0',
  proposed_version TEXT NOT NULL,
  formal_reasoning_summary TEXT NOT NULL,
  expected_improvement TEXT NOT NULL,
  impact_scope TEXT[] NOT NULL DEFAULT '{}',
  safety_flags TEXT[] NOT NULL DEFAULT '{}',
  constraint_preservation_proof TEXT,
  requires_eval BOOLEAN NOT NULL DEFAULT true,
  evaluation_run_id UUID REFERENCES public.evaluation_runs(id),
  approval_id UUID REFERENCES public.approvals(id),
  status public.self_mod_status NOT NULL DEFAULT 'candidate',
  promoted_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  previous_version_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.self_modification_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_self_mod" ON public.self_modification_proposals FOR ALL USING (true) WITH CHECK (true);

-- 3) Mutation Experiments (Darwin Mode)
CREATE TABLE public.mutation_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_version TEXT NOT NULL,
  mutated_version TEXT NOT NULL,
  mutation_type public.mutation_type NOT NULL,
  mutation_delta_description TEXT NOT NULL,
  target_entity_id TEXT,
  evaluation_suite_id UUID REFERENCES public.evaluation_suites(id),
  pass_rate NUMERIC(5,2),
  baseline_pass_rate NUMERIC(5,2),
  performance_delta JSONB DEFAULT '{}',
  token_delta INTEGER DEFAULT 0,
  cost_delta NUMERIC(10,4) DEFAULT 0,
  protected_scenarios_passed BOOLEAN DEFAULT false,
  status public.mutation_status NOT NULL DEFAULT 'running',
  promoted_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  previous_version_snapshot JSONB,
  approval_id UUID REFERENCES public.approvals(id),
  team_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mutation_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_mutation_exp" ON public.mutation_experiments FOR ALL USING (true) WITH CHECK (true);

-- 4) Correction Proposals (Cybernetic Feedback Loop)
CREATE TABLE public.correction_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type TEXT NOT NULL,
  trigger_metric_value NUMERIC(10,4) NOT NULL DEFAULT 0,
  trigger_threshold NUMERIC(10,4) NOT NULL DEFAULT 0,
  target_component public.evolution_target_component NOT NULL,
  target_entity_id TEXT,
  suggestion_summary TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  status public.correction_status NOT NULL DEFAULT 'proposed',
  resolved_at TIMESTAMPTZ,
  team_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.correction_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_correction" ON public.correction_proposals FOR ALL USING (true) WITH CHECK (true);

-- 5) Capability Templates
CREATE TABLE public.capability_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  source_team_id UUID REFERENCES public.teams(id),
  inherited_roles JSONB NOT NULL DEFAULT '[]',
  inherited_contracts JSONB NOT NULL DEFAULT '[]',
  inherited_traits JSONB NOT NULL DEFAULT '{}',
  performance_snapshot JSONB NOT NULL DEFAULT '{}',
  stability_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  cloned_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_cap_templates" ON public.capability_templates FOR ALL USING (true) WITH CHECK (true);

-- 6) Indexes
CREATE INDEX idx_self_mod_status ON public.self_modification_proposals(status);
CREATE INDEX idx_self_mod_target ON public.self_modification_proposals(target_component);
CREATE INDEX idx_mutation_status ON public.mutation_experiments(status);
CREATE INDEX idx_mutation_team ON public.mutation_experiments(team_id);
CREATE INDEX idx_correction_status ON public.correction_proposals(status);
CREATE INDEX idx_correction_team ON public.correction_proposals(team_id);
CREATE INDEX idx_cap_templates_source ON public.capability_templates(source_team_id);

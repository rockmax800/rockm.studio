
-- =============================================
-- Front Office Planning Artifacts — Canonical Persistence
-- =============================================

-- 1. Clarification Snapshots
CREATE TABLE public.clarification_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_request_id uuid NOT NULL REFERENCES public.intake_requests(id) ON DELETE CASCADE,
  project_type text NOT NULL DEFAULT '',
  priority_axis text NOT NULL DEFAULT '',
  scope_optimization_preference text NOT NULL DEFAULT '',
  constraints_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  integrations_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  timeline_notes text NOT NULL DEFAULT '',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clarification_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clarification_snapshots" ON public.clarification_snapshots FOR ALL TO public USING (true) WITH CHECK (true);

-- 2. Blueprint Modules
CREATE TABLE public.blueprint_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_contract_id uuid NOT NULL REFERENCES public.blueprint_contracts(id) ON DELETE CASCADE,
  name text NOT NULL,
  purpose text NOT NULL DEFAULT '',
  core_features_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  dependencies_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level text NOT NULL DEFAULT 'medium',
  complexity_estimate text NOT NULL DEFAULT 'medium',
  mvp_optional boolean NOT NULL DEFAULT false,
  retained_in_mvp boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blueprint_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to blueprint_modules" ON public.blueprint_modules FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. Blueprint Dependency Edges
CREATE TABLE public.blueprint_dependency_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_contract_id uuid NOT NULL REFERENCES public.blueprint_contracts(id) ON DELETE CASCADE,
  from_module text NOT NULL,
  to_module text NOT NULL,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blueprint_dependency_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to blueprint_dependency_edges" ON public.blueprint_dependency_edges FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. Blueprint Optimization Notes
CREATE TABLE public.blueprint_optimization_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_contract_id uuid NOT NULL REFERENCES public.blueprint_contracts(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'system',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blueprint_optimization_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to blueprint_optimization_notes" ON public.blueprint_optimization_notes FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. CTO Backlog Cards
CREATE TABLE public.cto_backlog_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_contract_id uuid NOT NULL REFERENCES public.blueprint_contracts(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  feature_slice text NOT NULL DEFAULT '',
  technical_spec text NOT NULL DEFAULT '',
  constraints_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  definition_of_done text NOT NULL DEFAULT '',
  test_requirements_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  forbidden_shortcuts_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  performance_constraints_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cto_backlog_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cto_backlog_cards" ON public.cto_backlog_cards FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. AI Task Drafts
CREATE TABLE public.ai_task_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_card_id uuid NOT NULL REFERENCES public.cto_backlog_cards(id) ON DELETE CASCADE,
  title text NOT NULL,
  layer_type text NOT NULL DEFAULT 'service',
  owner_role text NOT NULL DEFAULT 'engineer',
  definition_of_done text NOT NULL DEFAULT '',
  allowed_area text NOT NULL DEFAULT '',
  forbidden_area text NOT NULL DEFAULT '',
  complexity_score integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_task_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ai_task_drafts" ON public.ai_task_drafts FOR ALL TO public USING (true) WITH CHECK (true);

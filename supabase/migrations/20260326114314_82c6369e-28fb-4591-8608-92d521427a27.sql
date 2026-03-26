
-- ══ AI CTO Planning Artifacts — Canonical Persistence ══
-- These tables store planning-phase artifacts (Intent Plane).
-- They are NOT live Delivery Plane tasks. Separation is enforced by status field.

-- 1. Engineering Slice Drafts
CREATE TABLE public.engineering_slice_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blueprint_contract_id UUID NOT NULL REFERENCES public.blueprint_contracts(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  module_name TEXT NOT NULL,
  business_goal TEXT NOT NULL DEFAULT '',
  technical_boundary TEXT NOT NULL DEFAULT '',
  allowed_repo_areas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_touch_points_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  expected_interfaces_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  performance_constraints_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_scope_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_complexity_score INTEGER NOT NULL DEFAULT 8,
  execution_batch INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.engineering_slice_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to engineering_slice_drafts" ON public.engineering_slice_drafts FOR ALL USING (true) WITH CHECK (true);

-- 2. TaskSpec Drafts
CREATE TABLE public.taskspec_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engineering_slice_id UUID NOT NULL REFERENCES public.engineering_slice_drafts(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  title TEXT NOT NULL,
  engineering_layer TEXT NOT NULL DEFAULT 'service',
  owner_role TEXT NOT NULL DEFAULT 'engineer',
  goal TEXT NOT NULL DEFAULT '',
  allowed_repo_paths_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_repo_paths_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  acceptance_criteria_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_plan_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  definition_of_done_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_artifacts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_class TEXT NOT NULL DEFAULT 'low',
  complexity_score INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.taskspec_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to taskspec_drafts" ON public.taskspec_drafts FOR ALL USING (true) WITH CHECK (true);

-- 3. Execution Plan Drafts
CREATE TABLE public.execution_plan_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blueprint_contract_id UUID NOT NULL REFERENCES public.blueprint_contracts(id) ON DELETE CASCADE,
  taskspec_draft_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  batches_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  critical_path_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_plan_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to execution_plan_drafts" ON public.execution_plan_drafts FOR ALL USING (true) WITH CHECK (true);

-- 4. CTO Conformance Reports
CREATE TABLE public.cto_conformance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  taskspec_draft_id UUID REFERENCES public.taskspec_drafts(id) ON DELETE SET NULL,
  dod_met BOOLEAN NOT NULL DEFAULT false,
  boundary_respected BOOLEAN NOT NULL DEFAULT false,
  forbidden_changes_detected BOOLEAN NOT NULL DEFAULT false,
  artifacts_complete BOOLEAN NOT NULL DEFAULT false,
  summary TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cto_conformance_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cto_conformance_reports" ON public.cto_conformance_reports FOR ALL USING (true) WITH CHECK (true);

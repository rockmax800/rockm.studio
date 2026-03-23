-- ==========================================
-- AI Workshop OS — V1 Data Model
-- ==========================================

-- Enums
CREATE TYPE public.project_state AS ENUM ('draft', 'scoped', 'active', 'blocked', 'in_review', 'paused', 'completed', 'archived');
CREATE TYPE public.doc_type AS ENUM ('brief', 'domain', 'lifecycle', 'collaboration', 'agent_instructions', 'ui_spec', 'data_model', 'other');
CREATE TYPE public.doc_status AS ENUM ('draft', 'active', 'canonical', 'superseded', 'archived');
CREATE TYPE public.agent_role_status AS ENUM ('active', 'inactive');
CREATE TYPE public.task_domain AS ENUM ('founder_control', 'docs', 'orchestration', 'frontend', 'backend', 'review', 'qa', 'release');
CREATE TYPE public.task_output_type AS ENUM ('document', 'frontend', 'backend', 'schema', 'review', 'approval_packet', 'test', 'release');
CREATE TYPE public.task_state AS ENUM ('draft', 'ready', 'assigned', 'in_progress', 'waiting_review', 'rework_required', 'blocked', 'escalated', 'approved', 'done', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.task_urgency AS ENUM ('normal', 'high', 'blocker');
CREATE TYPE public.run_state AS ENUM ('created', 'preparing', 'running', 'produced_output', 'failed', 'timed_out', 'cancelled', 'superseded', 'finalized');
CREATE TYPE public.artifact_type AS ENUM ('document', 'architecture', 'frontend', 'backend', 'schema', 'test', 'review', 'release');
CREATE TYPE public.artifact_state AS ENUM ('created', 'classified', 'submitted', 'under_review', 'accepted', 'rejected', 'superseded', 'frozen', 'archived');
CREATE TYPE public.storage_kind AS ENUM ('db_text', 'file_path', 'github_ref', 'external');
CREATE TYPE public.review_state AS ENUM ('created', 'in_progress', 'needs_clarification', 'approved', 'approved_with_notes', 'rejected', 'escalated', 'closed');
CREATE TYPE public.review_verdict AS ENUM ('approved', 'approved_with_notes', 'rejected', 'escalated');
CREATE TYPE public.approval_type AS ENUM ('project_activation', 'architecture', 'schema', 'scope_change', 'release', 'cancellation');
CREATE TYPE public.approval_target_type AS ENUM ('project', 'task', 'artifact', 'review', 'document');
CREATE TYPE public.approval_state AS ENUM ('pending', 'approved', 'rejected', 'deferred', 'expired', 'closed');
CREATE TYPE public.entity_type AS ENUM ('project', 'document', 'task', 'context_pack', 'run', 'artifact', 'review', 'approval');
CREATE TYPE public.actor_type AS ENUM ('founder', 'system', 'agent_role');

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ==========================================
-- PROJECTS
-- ==========================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  project_type TEXT,
  current_phase TEXT,
  state public.project_state NOT NULL DEFAULT 'draft',
  founder_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_projects_state ON public.projects (state);

-- ==========================================
-- AGENT ROLES
-- ==========================================
CREATE TABLE public.agent_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  status public.agent_role_status NOT NULL DEFAULT 'active',
  allowed_domains JSONB,
  allowed_actions JSONB,
  forbidden_actions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to agent_roles" ON public.agent_roles FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_agent_roles_updated_at BEFORE UPDATE ON public.agent_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- DOCUMENTS
-- ==========================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  doc_type public.doc_type NOT NULL DEFAULT 'other',
  status public.doc_status NOT NULL DEFAULT 'draft',
  version_label TEXT,
  content_markdown TEXT NOT NULL DEFAULT '',
  source_task_id UUID,
  source_artifact_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_documents_project_id ON public.documents (project_id);
CREATE INDEX idx_documents_file_path ON public.documents (file_path);

-- ==========================================
-- TASKS
-- ==========================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.tasks(id),
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  domain public.task_domain NOT NULL,
  owner_role_id UUID REFERENCES public.agent_roles(id),
  expected_output_type public.task_output_type NOT NULL,
  state public.task_state NOT NULL DEFAULT 'draft',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  urgency public.task_urgency DEFAULT 'normal',
  acceptance_criteria JSONB NOT NULL DEFAULT '[]',
  constraints JSONB,
  blocker_reason TEXT,
  escalation_reason TEXT,
  requested_outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tasks_project_id ON public.tasks (project_id);
CREATE INDEX idx_tasks_state ON public.tasks (state);
CREATE INDEX idx_tasks_owner_role_id ON public.tasks (owner_role_id);

-- ==========================================
-- CONTEXT PACKS
-- ==========================================
CREATE TABLE public.context_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  summary TEXT,
  included_document_ids JSONB,
  included_artifact_ids JSONB,
  included_file_paths JSONB,
  assumptions JSONB,
  missing_context_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.context_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to context_packs" ON public.context_packs FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_context_packs_updated_at BEFORE UPDATE ON public.context_packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- RUNS
-- ==========================================
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  agent_role_id UUID NOT NULL REFERENCES public.agent_roles(id),
  context_pack_id UUID REFERENCES public.context_packs(id),
  state public.run_state NOT NULL DEFAULT 'created',
  run_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status_summary TEXT,
  failure_reason TEXT,
  output_summary TEXT,
  retry_of_run_id UUID REFERENCES public.runs(id),
  superseded_by_run_id UUID REFERENCES public.runs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, run_number)
);

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to runs" ON public.runs FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_runs_updated_at BEFORE UPDATE ON public.runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_runs_task_id ON public.runs (task_id);
CREATE INDEX idx_runs_state ON public.runs (state);

-- ==========================================
-- ARTIFACTS
-- ==========================================
CREATE TABLE public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id),
  run_id UUID REFERENCES public.runs(id),
  artifact_type public.artifact_type NOT NULL,
  title TEXT NOT NULL,
  state public.artifact_state NOT NULL DEFAULT 'created',
  storage_kind public.storage_kind NOT NULL DEFAULT 'db_text',
  content_text TEXT,
  file_path TEXT,
  external_ref TEXT,
  summary TEXT,
  canonical_flag BOOLEAN NOT NULL DEFAULT false,
  supersedes_artifact_id UUID REFERENCES public.artifacts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to artifacts" ON public.artifacts FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_artifacts_updated_at BEFORE UPDATE ON public.artifacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_artifacts_project_id ON public.artifacts (project_id);
CREATE INDEX idx_artifacts_task_id ON public.artifacts (task_id);
CREATE INDEX idx_artifacts_run_id ON public.artifacts (run_id);
CREATE INDEX idx_artifacts_state ON public.artifacts (state);

-- ==========================================
-- REVIEWS
-- ==========================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  reviewer_role_id UUID NOT NULL REFERENCES public.agent_roles(id),
  state public.review_state NOT NULL DEFAULT 'created',
  verdict public.review_verdict,
  reason TEXT,
  blocking_issues JSONB,
  non_blocking_notes JSONB,
  suggested_next_step TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_reviews_artifact_id ON public.reviews (artifact_id);
CREATE INDEX idx_reviews_state ON public.reviews (state);

-- ==========================================
-- APPROVALS
-- ==========================================
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  approval_type public.approval_type NOT NULL,
  target_type public.approval_target_type NOT NULL,
  target_id UUID NOT NULL,
  requested_by_role_id UUID REFERENCES public.agent_roles(id),
  state public.approval_state NOT NULL DEFAULT 'pending',
  summary TEXT NOT NULL,
  recommendation TEXT,
  consequence_if_approved TEXT,
  consequence_if_rejected TEXT,
  founder_decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to approvals" ON public.approvals FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_approvals_project_id ON public.approvals (project_id);
CREATE INDEX idx_approvals_state ON public.approvals (state);

-- ==========================================
-- ACTIVITY EVENTS
-- ==========================================
CREATE TABLE public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type public.entity_type NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_type public.actor_type NOT NULL DEFAULT 'system',
  actor_role_id UUID REFERENCES public.agent_roles(id),
  event_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to activity_events" ON public.activity_events FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_activity_events_project_id ON public.activity_events (project_id);
CREATE INDEX idx_activity_events_entity ON public.activity_events (entity_type, entity_id);

-- Deferred FKs for documents
ALTER TABLE public.documents ADD CONSTRAINT fk_documents_source_task FOREIGN KEY (source_task_id) REFERENCES public.tasks(id);
ALTER TABLE public.documents ADD CONSTRAINT fk_documents_source_artifact FOREIGN KEY (source_artifact_id) REFERENCES public.artifacts(id);
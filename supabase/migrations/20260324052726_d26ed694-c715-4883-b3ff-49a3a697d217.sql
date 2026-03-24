
-- Delivery Spine: additive entities for code, CI, and deployment lifecycle

-- Repository provider enum
DO $$ BEGIN
  CREATE TYPE public.repo_provider AS ENUM ('github', 'gitea', 'gitlab', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Repository status enum
DO $$ BEGIN
  CREATE TYPE public.repo_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Workspace sandbox mode enum
DO $$ BEGIN
  CREATE TYPE public.sandbox_mode AS ENUM ('isolated', 'host');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Workspace status enum
DO $$ BEGIN
  CREATE TYPE public.workspace_status AS ENUM ('created', 'active', 'merged', 'discarded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Pull request status enum
DO $$ BEGIN
  CREATE TYPE public.pr_status AS ENUM ('opened', 'merged', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Check suite status enum
DO $$ BEGIN
  CREATE TYPE public.check_suite_status AS ENUM ('queued', 'running', 'passed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CI provider enum
DO $$ BEGIN
  CREATE TYPE public.ci_provider AS ENUM ('github_actions', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Deployment environment enum
DO $$ BEGIN
  CREATE TYPE public.deploy_environment AS ENUM ('staging', 'production', 'preview');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Deployment source type enum
DO $$ BEGIN
  CREATE TYPE public.deploy_source_type AS ENUM ('branch', 'pr', 'tag');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Deployment status enum
DO $$ BEGIN
  CREATE TYPE public.deploy_status AS ENUM ('pending', 'deploying', 'live', 'failed', 'rolled_back');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Domain binding status enum
DO $$ BEGIN
  CREATE TYPE public.domain_binding_status AS ENUM ('active', 'misconfigured', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Domain target type enum
DO $$ BEGIN
  CREATE TYPE public.domain_target_type AS ENUM ('ip', 'cname', 'platform');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Repositories
CREATE TABLE IF NOT EXISTS public.repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  provider public.repo_provider NOT NULL DEFAULT 'github',
  repo_owner text NOT NULL,
  repo_name text NOT NULL,
  default_branch text NOT NULL DEFAULT 'main',
  status public.repo_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(repo_owner, repo_name)
);

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to repositories" ON public.repositories
  FOR ALL TO public USING (true) WITH CHECK (true);

-- 2. Repo Workspaces
CREATE TABLE IF NOT EXISTS public.repo_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  task_id uuid NOT NULL REFERENCES public.tasks(id),
  run_id uuid NOT NULL REFERENCES public.runs(id),
  repository_id uuid NOT NULL REFERENCES public.repositories(id),
  branch_name text NOT NULL,
  worktree_path text,
  head_sha text,
  sandbox_mode public.sandbox_mode NOT NULL DEFAULT 'isolated',
  status public.workspace_status NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

ALTER TABLE public.repo_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to repo_workspaces" ON public.repo_workspaces
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_repo_workspaces_run_id ON public.repo_workspaces(run_id);
CREATE INDEX IF NOT EXISTS idx_repo_workspaces_task_id ON public.repo_workspaces(task_id);

-- 3. Pull Requests
CREATE TABLE IF NOT EXISTS public.pull_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  task_id uuid NOT NULL REFERENCES public.tasks(id),
  run_id uuid NOT NULL REFERENCES public.runs(id),
  repository_id uuid NOT NULL REFERENCES public.repositories(id),
  pr_number integer,
  source_branch text NOT NULL,
  target_branch text NOT NULL,
  title text NOT NULL,
  status public.pr_status NOT NULL DEFAULT 'opened',
  opened_at timestamptz NOT NULL DEFAULT now(),
  merged_at timestamptz,
  closed_at timestamptz
);

ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to pull_requests" ON public.pull_requests
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pull_requests_task_id ON public.pull_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_run_id ON public.pull_requests(run_id);

-- 4. Check Suites
CREATE TABLE IF NOT EXISTS public.check_suites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  task_id uuid NOT NULL REFERENCES public.tasks(id),
  pull_request_id uuid NOT NULL REFERENCES public.pull_requests(id),
  provider public.ci_provider NOT NULL DEFAULT 'github_actions',
  external_run_ref text,
  status public.check_suite_status NOT NULL DEFAULT 'queued',
  summary text,
  logs_ref text,
  started_at timestamptz,
  finished_at timestamptz
);

ALTER TABLE public.check_suites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to check_suites" ON public.check_suites
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_check_suites_pr_id ON public.check_suites(pull_request_id);

-- 5. Deployments
CREATE TABLE IF NOT EXISTS public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  environment public.deploy_environment NOT NULL,
  source_type public.deploy_source_type NOT NULL,
  source_ref text NOT NULL,
  version_label text,
  status public.deploy_status NOT NULL DEFAULT 'pending',
  preview_url text,
  logs_ref text,
  started_at timestamptz,
  finished_at timestamptz,
  rollback_of_deployment_id uuid REFERENCES public.deployments(id)
);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to deployments" ON public.deployments
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON public.deployments(project_id);

-- 6. Domain Bindings
CREATE TABLE IF NOT EXISTS public.domain_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  environment public.deploy_environment NOT NULL,
  domain text NOT NULL,
  dns_status text NOT NULL DEFAULT 'pending',
  tls_status text NOT NULL DEFAULT 'pending',
  target_type public.domain_target_type NOT NULL DEFAULT 'cname',
  target_value text NOT NULL,
  healthcheck_url text,
  status public.domain_binding_status NOT NULL DEFAULT 'pending',
  UNIQUE(domain)
);

ALTER TABLE public.domain_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to domain_bindings" ON public.domain_bindings
  FOR ALL TO public USING (true) WITH CHECK (true);

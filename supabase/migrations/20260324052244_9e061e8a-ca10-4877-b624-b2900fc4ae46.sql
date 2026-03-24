
-- Create handoff_outcome enum
DO $$ BEGIN
  CREATE TYPE public.handoff_outcome AS ENUM ('implementation', 'review', 'clarification', 'approval_prep', 'qa', 'release');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create handoff_status enum
DO $$ BEGIN
  CREATE TYPE public.handoff_status AS ENUM ('created', 'acknowledged', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create handoffs table
CREATE TABLE IF NOT EXISTS public.handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  task_id uuid NOT NULL REFERENCES public.tasks(id),
  source_role_id uuid NOT NULL REFERENCES public.agent_roles(id),
  target_role_id uuid NOT NULL REFERENCES public.agent_roles(id),
  requested_outcome public.handoff_outcome NOT NULL,
  context_pack_id uuid REFERENCES public.context_packs(id),
  source_artifact_ids_json jsonb DEFAULT '[]'::jsonb,
  constraints_json jsonb DEFAULT '[]'::jsonb,
  acceptance_criteria_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  open_questions_json jsonb DEFAULT '[]'::jsonb,
  urgency public.task_urgency NOT NULL DEFAULT 'normal',
  status public.handoff_status NOT NULL DEFAULT 'created',
  created_from_review_id uuid REFERENCES public.reviews(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  closed_at timestamptz
);

-- Add current_handoff_id to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS current_handoff_id uuid REFERENCES public.handoffs(id);

-- Enable RLS
ALTER TABLE public.handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to handoffs" ON public.handoffs
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_handoffs_task_id ON public.handoffs(task_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON public.handoffs(status);
CREATE INDEX IF NOT EXISTS idx_handoffs_target_role ON public.handoffs(target_role_id);

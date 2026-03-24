-- Employee Training canonical persistence layer
-- Separate from delivery state — this is knowledge/training plane

-- 1. Training sessions
CREATE TABLE public.employee_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Training Session',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employee_training_sessions" ON public.employee_training_sessions FOR ALL TO public USING (true) WITH CHECK (true);
CREATE TRIGGER update_employee_training_sessions_updated_at BEFORE UPDATE ON public.employee_training_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Training messages (conversation thread)
CREATE TABLE public.employee_training_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.employee_training_sessions(id) ON DELETE CASCADE,
  author_type text NOT NULL DEFAULT 'founder',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_training_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employee_training_messages" ON public.employee_training_messages FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. Training materials (structured blocks)
CREATE TABLE public.employee_training_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.employee_training_sessions(id) ON DELETE CASCADE,
  material_type text NOT NULL DEFAULT 'note',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_training_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employee_training_materials" ON public.employee_training_materials FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. Prompt drafts (versioned, publishable)
CREATE TABLE public.employee_prompt_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.employee_training_sessions(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  prompt_markdown text NOT NULL DEFAULT '',
  synthesized_from_session boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_prompt_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employee_prompt_drafts" ON public.employee_prompt_drafts FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Training events (audit log)
CREATE TABLE public.employee_training_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.employee_training_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_training_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employee_training_events" ON public.employee_training_events FOR ALL TO public USING (true) WITH CHECK (true);

-- PART 9: Autonomy Settings
CREATE TABLE IF NOT EXISTS public.autonomy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  auto_generate_tasks boolean NOT NULL DEFAULT false,
  auto_execute_implementation boolean NOT NULL DEFAULT false,
  auto_retry_enabled boolean NOT NULL DEFAULT true,
  max_parallel_runs integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);
ALTER TABLE public.autonomy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to autonomy_settings" ON public.autonomy_settings FOR ALL TO public USING (true) WITH CHECK (true);

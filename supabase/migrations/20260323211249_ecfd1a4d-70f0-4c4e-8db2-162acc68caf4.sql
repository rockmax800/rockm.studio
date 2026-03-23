
-- Part 1: system_settings table
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL DEFAULT 'production' CHECK (mode IN ('production', 'experimental')),
  experimental_features jsonb NOT NULL DEFAULT '{"enable_autonomy":false,"enable_dual_verification":false,"enable_self_review":false,"enable_context_compression":false,"enable_model_competition":false,"enable_prompt_experiments":false,"enable_blog":false}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to system_settings" ON public.system_settings FOR ALL TO public USING (true) WITH CHECK (true);

-- Insert default production row
INSERT INTO public.system_settings (mode) VALUES ('production');

-- Part 6: system_suggestions table
CREATE TABLE public.system_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('hr', 'prompt', 'model', 'prediction')),
  entity_id uuid NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to system_suggestions" ON public.system_suggestions FOR ALL TO public USING (true) WITH CHECK (true);


-- Product Blueprints table
CREATE TABLE public.product_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  name text NOT NULL,
  scope_template text NOT NULL DEFAULT '',
  required_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_autonomy_level text NOT NULL DEFAULT 'manual',
  estimate_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to product_blueprints" ON public.product_blueprints
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Presale Sessions table
CREATE TABLE public.presale_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug text NOT NULL,
  blueprint_id uuid REFERENCES public.product_blueprints(id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  client_brief text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  spec_content text NOT NULL DEFAULT '',
  estimate_tokens_min integer NOT NULL DEFAULT 0,
  estimate_tokens_avg integer NOT NULL DEFAULT 0,
  estimate_tokens_max integer NOT NULL DEFAULT 0,
  estimate_cost_min numeric NOT NULL DEFAULT 0,
  estimate_cost_max numeric NOT NULL DEFAULT 0,
  estimate_timeline_days integer NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low',
  risk_notes text NOT NULL DEFAULT '',
  converted_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.presale_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to presale_sessions" ON public.presale_sessions
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Building2',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to departments" ON public.departments
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Seed default departments
INSERT INTO public.departments (slug, name, description, icon) VALUES
  ('mobile-studio', 'Mobile Studio', 'iOS and Android application development', 'Smartphone'),
  ('telegram-bot-lab', 'Telegram Bot Lab', 'Telegram bot and mini-app development', 'Bot'),
  ('web-studio', 'Web Studio', 'Web application and SaaS development', 'Globe'),
  ('b2b-platform', 'B2B Platform Division', 'Enterprise platform and integration solutions', 'Building2');

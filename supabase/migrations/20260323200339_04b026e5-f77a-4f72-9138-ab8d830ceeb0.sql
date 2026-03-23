
-- Provider tables for AI Workshop OS (doc 18 aligned)

-- Providers
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  base_url text,
  supports_text boolean NOT NULL DEFAULT true,
  supports_streaming boolean NOT NULL DEFAULT false,
  supports_tools boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to providers" ON public.providers FOR ALL TO public USING (true) WITH CHECK (true);

-- Provider Models
CREATE TABLE public.provider_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  model_code text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  intended_use text,
  max_context integer,
  supports_json boolean DEFAULT false,
  supports_streaming boolean DEFAULT false,
  supports_tool_use boolean DEFAULT false,
  cost_profile_hint text,
  latency_profile_hint text,
  quality_profile_hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to provider_models" ON public.provider_models FOR ALL TO public USING (true) WITH CHECK (true);

-- Provider Credentials
CREATE TABLE public.provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  credential_label text NOT NULL,
  secret_ref text,
  status text NOT NULL DEFAULT 'valid',
  last_validated_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to provider_credentials" ON public.provider_credentials FOR ALL TO public USING (true) WITH CHECK (true);

-- Provider Usage Logs
CREATE TABLE public.provider_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers(id),
  model_id uuid REFERENCES public.provider_models(id),
  run_id uuid,
  project_id uuid,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  estimated_cost_usd numeric(10,6) DEFAULT 0,
  latency_ms integer DEFAULT 0,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to provider_usage_logs" ON public.provider_usage_logs FOR ALL TO public USING (true) WITH CHECK (true);

-- Routing Policies
CREATE TABLE public.routing_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name text NOT NULL,
  task_domain text NOT NULL,
  role_code text NOT NULL,
  requested_outcome text,
  preferred_provider_id uuid NOT NULL REFERENCES public.providers(id),
  preferred_model_id uuid NOT NULL REFERENCES public.provider_models(id),
  fallback_provider_id uuid REFERENCES public.providers(id),
  fallback_model_id uuid REFERENCES public.provider_models(id),
  allow_fallback boolean NOT NULL DEFAULT false,
  allow_cross_provider_retry boolean NOT NULL DEFAULT false,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.routing_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to routing_policies" ON public.routing_policies FOR ALL TO public USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_provider_models_updated_at BEFORE UPDATE ON public.provider_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_provider_credentials_updated_at BEFORE UPDATE ON public.provider_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_routing_policies_updated_at BEFORE UPDATE ON public.routing_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

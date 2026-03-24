
-- Domain Binding Specs entity for deployment gate enforcement
CREATE TABLE public.domain_binding_specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  environment TEXT NOT NULL DEFAULT 'production',
  domain TEXT NOT NULL,
  ssl_required BOOLEAN NOT NULL DEFAULT true,
  expected_health_endpoint TEXT,
  rollback_domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, domain)
);

-- Enforcement metrics counters
CREATE TABLE public.enforcement_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  metric_type TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_enforcement_metrics_project ON public.enforcement_metrics(project_id);
CREATE INDEX idx_enforcement_metrics_type ON public.enforcement_metrics(metric_type);
CREATE INDEX idx_domain_binding_specs_project ON public.domain_binding_specs(project_id);

-- RLS (internal system, open access)
ALTER TABLE public.domain_binding_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enforcement_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to domain_binding_specs" ON public.domain_binding_specs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to enforcement_metrics" ON public.enforcement_metrics FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_domain_binding_specs_updated_at
  BEFORE UPDATE ON public.domain_binding_specs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

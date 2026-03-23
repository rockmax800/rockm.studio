
-- PART 1: Model Market entity
CREATE TABLE public.model_market (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model_name text NOT NULL,
  max_context integer NOT NULL DEFAULT 128000,
  estimated_cost_per_1k_tokens double precision NOT NULL DEFAULT 0,
  avg_latency_score double precision NOT NULL DEFAULT 0.5,
  avg_quality_score double precision NOT NULL DEFAULT 0.5,
  reliability_score double precision NOT NULL DEFAULT 0.5,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, model_name)
);

ALTER TABLE public.model_market ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to model_market"
  ON public.model_market FOR ALL TO public
  USING (true) WITH CHECK (true);

-- PART 2: Model Benchmarks per department
CREATE TABLE public.model_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_market_id uuid NOT NULL REFERENCES public.model_market(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  avg_success_rate double precision NOT NULL DEFAULT 0,
  avg_cost double precision NOT NULL DEFAULT 0,
  avg_latency double precision NOT NULL DEFAULT 0,
  bug_rate double precision NOT NULL DEFAULT 0,
  sample_size integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(model_market_id, team_id)
);

ALTER TABLE public.model_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to model_benchmarks"
  ON public.model_benchmarks FOR ALL TO public
  USING (true) WITH CHECK (true);

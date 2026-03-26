CREATE TABLE public.market_benchmark_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('company_lead', 'intake', 'project')),
  source_id uuid NOT NULL,
  assumptions_version text NOT NULL,
  country_code text NOT NULL,
  ai_internal_cost_usd numeric NOT NULL DEFAULT 0,
  studio_offer_price_usd numeric NOT NULL DEFAULT 0,
  human_equivalent_cost_usd numeric NOT NULL DEFAULT 0,
  advantage_ratio numeric,
  value_capture numeric,
  gross_ai_margin_usd numeric NOT NULL DEFAULT 0,
  ai_efficiency_spread numeric,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_benchmark_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to market_benchmark_snapshots"
  ON public.market_benchmark_snapshots FOR ALL
  TO public USING (true) WITH CHECK (true);

CREATE TABLE public.market_benchmark_role_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.market_benchmark_snapshots(id) ON DELETE CASCADE,
  role_code text NOT NULL,
  role_label text NOT NULL,
  country_code text NOT NULL,
  monthly_salary_usd numeric NOT NULL DEFAULT 0,
  effort_months numeric NOT NULL DEFAULT 0,
  allocation_pct numeric NOT NULL DEFAULT 0,
  overhead_multiplier numeric NOT NULL DEFAULT 1,
  velocity_index numeric NOT NULL DEFAULT 1,
  human_equivalent_cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_benchmark_role_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to market_benchmark_role_lines"
  ON public.market_benchmark_role_lines FOR ALL
  TO public USING (true) WITH CHECK (true);

CREATE INDEX idx_benchmark_snapshots_source ON public.market_benchmark_snapshots(source_type, source_id);
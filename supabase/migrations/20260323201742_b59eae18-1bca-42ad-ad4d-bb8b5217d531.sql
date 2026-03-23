
-- PART 3: Add adaptive routing thresholds and dual verification to routing_policies
ALTER TABLE public.routing_policies ADD COLUMN IF NOT EXISTS enable_dual_verification boolean NOT NULL DEFAULT false;
ALTER TABLE public.routing_policies ADD COLUMN IF NOT EXISTS min_success_rate_threshold double precision DEFAULT NULL;
ALTER TABLE public.routing_policies ADD COLUMN IF NOT EXISTS max_cost_threshold double precision DEFAULT NULL;
ALTER TABLE public.routing_policies ADD COLUMN IF NOT EXISTS max_latency_threshold integer DEFAULT NULL;

-- PART 4: Context compression memory
CREATE TABLE IF NOT EXISTS public.context_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.context_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to context_snapshots" ON public.context_snapshots FOR ALL TO public USING (true) WITH CHECK (true);

-- PART 5: Add validation columns to run_evaluations
ALTER TABLE public.run_evaluations ADD COLUMN IF NOT EXISTS validation_passed boolean DEFAULT NULL;
ALTER TABLE public.run_evaluations ADD COLUMN IF NOT EXISTS validation_risk_level text DEFAULT NULL;

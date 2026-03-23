
CREATE TABLE IF NOT EXISTS public.bottleneck_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  prediction_type text NOT NULL,
  confidence_score double precision NOT NULL DEFAULT 0,
  explanation text,
  role_id uuid REFERENCES public.agent_roles(id) ON DELETE SET NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bottleneck_predictions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bottleneck_predictions' AND policyname = 'Allow all access to bottleneck_predictions'
  ) THEN
    CREATE POLICY "Allow all access to bottleneck_predictions"
      ON public.bottleneck_predictions FOR ALL TO public
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.bottleneck_predictions;

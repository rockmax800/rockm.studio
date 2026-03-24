
-- Worker nodes for operational diagnostics
CREATE TABLE public.worker_nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hostname text NOT NULL,
  last_heartbeat_at timestamp with time zone NOT NULL DEFAULT now(),
  active_runs_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'online',
  cpu_usage_pct numeric,
  memory_usage_pct numeric,
  docker_container_count integer DEFAULT 0,
  disk_usage_pct numeric,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.worker_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to worker_nodes" ON public.worker_nodes FOR ALL TO public USING (true) WITH CHECK (true);

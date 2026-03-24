
-- Section 1: Sandbox Policy Model
CREATE TABLE public.sandbox_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  cpu_limit numeric NOT NULL DEFAULT 1.0,
  memory_limit_mb integer NOT NULL DEFAULT 512,
  timeout_seconds integer NOT NULL DEFAULT 300,
  allowed_network boolean NOT NULL DEFAULT false,
  allowed_ports_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_only_root boolean NOT NULL DEFAULT true,
  allowed_paths_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sandbox_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sandbox_policies" ON public.sandbox_policies FOR ALL TO public USING (true) WITH CHECK (true);

-- Add sandbox_policy_id to runs
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS sandbox_policy_id uuid REFERENCES public.sandbox_policies(id);

-- Add exit_code to runs for container exit tracking
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS exit_code integer;

-- Insert default sandbox policy
INSERT INTO public.sandbox_policies (name, cpu_limit, memory_limit_mb, timeout_seconds, allowed_network, read_only_root)
VALUES
  ('default', 1.0, 512, 300, false, true),
  ('network-allowed', 2.0, 1024, 600, true, true),
  ('heavy-compute', 4.0, 2048, 900, false, false);


-- Add lean mode columns to autonomy_settings
ALTER TABLE public.autonomy_settings
  ADD COLUMN IF NOT EXISTS max_autonomy_depth integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS autonomy_token_budget integer NOT NULL DEFAULT 15000;

-- Update existing rows to lean defaults
UPDATE public.autonomy_settings SET
  auto_generate_tasks = true,
  auto_execute_implementation = false,
  auto_retry_enabled = false,
  max_parallel_runs = 1,
  max_autonomy_depth = 3,
  autonomy_token_budget = 15000;

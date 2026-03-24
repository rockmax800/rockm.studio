
-- Outbox Events table for transactional outbox pattern
CREATE TABLE public.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid,
  causation_id uuid,
  idempotency_key text,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz
);

-- Indexes for outbox polling and idempotency
CREATE INDEX idx_outbox_pending ON public.outbox_events(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_outbox_correlation ON public.outbox_events(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE UNIQUE INDEX idx_outbox_idempotency ON public.outbox_events(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to outbox_events" ON public.outbox_events FOR ALL USING (true) WITH CHECK (true);

-- Lease fields on runs table
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS lease_acquired_at timestamptz;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;

-- Index for lease reclaim detection
CREATE INDEX IF NOT EXISTS idx_runs_lease_expires ON public.runs(lease_expires_at) WHERE state = 'running' AND lease_expires_at IS NOT NULL;

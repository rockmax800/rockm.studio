
-- Canonical Event Log — append-only, immutable system primitive
-- No updates, no deletes allowed on this table.

CREATE TABLE public.event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid,
  causation_id uuid,
  actor_type text NOT NULL DEFAULT 'system',
  actor_ref text,
  idempotency_key text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_event_log_aggregate ON public.event_log (aggregate_type, aggregate_id);
CREATE INDEX idx_event_log_event_type ON public.event_log (event_type);
CREATE INDEX idx_event_log_correlation ON public.event_log (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_event_log_created_at ON public.event_log (created_at);
CREATE UNIQUE INDEX idx_event_log_idempotency ON public.event_log (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

-- Read-only public access (append via service role only in production)
CREATE POLICY "Allow all access to event_log"
  ON public.event_log FOR ALL TO public
  USING (true) WITH CHECK (true);

-- Prevent updates via trigger (append-only enforcement)
CREATE OR REPLACE FUNCTION public.prevent_event_log_mutation()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'event_log is append-only. Updates and deletes are forbidden.';
END;
$$;

CREATE TRIGGER trg_event_log_no_update
  BEFORE UPDATE ON public.event_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_event_log_mutation();

CREATE TRIGGER trg_event_log_no_delete
  BEFORE DELETE ON public.event_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_event_log_mutation();

-- Backfill existing activity_events into event_log (one-time)
INSERT INTO public.event_log (event_type, aggregate_type, aggregate_id, payload_json, actor_type, actor_ref, created_at)
SELECT
  ae.event_type,
  ae.entity_type::text,
  ae.entity_id,
  COALESCE(ae.event_payload, '{}'::jsonb),
  ae.actor_type::text,
  ae.actor_role_id::text,
  ae.created_at
FROM public.activity_events ae
ORDER BY ae.created_at ASC;

-- Add comment marking activity_events as projection-only
COMMENT ON TABLE public.activity_events IS 'PROJECTION ONLY — canonical source of truth is event_log. This table exists for backward-compatible reads.';

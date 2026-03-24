-- Migrate existing boolean approvals to Approval entity records
-- Blueprint contracts with approved_by_founder = true
INSERT INTO public.approvals (
  target_type, target_id, approval_type, summary, project_id,
  state, decision, decided_at, closed_at, founder_decision_note
)
SELECT
  'blueprint_contract'::approval_target_type,
  bc.id,
  'blueprint_approval'::approval_type,
  'Blueprint contract approval (migrated from boolean flag)',
  COALESCE(
    (SELECT p.id FROM public.projects p WHERE p.blueprint_contract_id = bc.id LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  'closed'::approval_state,
  'approved'::approval_decision,
  bc.approved_at,
  bc.approved_at,
  'Migrated from approved_by_founder boolean'
FROM public.blueprint_contracts bc
WHERE bc.approved_by_founder = true;

-- Estimate reports with approved_by_founder = true
INSERT INTO public.approvals (
  target_type, target_id, approval_type, summary, project_id,
  state, decision, decided_at, closed_at, founder_decision_note
)
SELECT
  'estimate_report'::approval_target_type,
  er.id,
  'estimate_approval'::approval_type,
  'Estimate report approval (migrated from boolean flag)',
  COALESCE(
    (SELECT p.id FROM public.projects p WHERE p.estimate_report_id = er.id LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  'closed'::approval_state,
  'approved'::approval_decision,
  er.approved_at,
  er.approved_at,
  'Migrated from approved_by_founder boolean'
FROM public.estimate_reports er
WHERE er.approved_by_founder = true;

-- Drop boolean approval columns
ALTER TABLE public.blueprint_contracts DROP COLUMN IF EXISTS approved_by_founder;
ALTER TABLE public.blueprint_contracts DROP COLUMN IF EXISTS approved_at;
ALTER TABLE public.estimate_reports DROP COLUMN IF EXISTS approved_by_founder;
ALTER TABLE public.estimate_reports DROP COLUMN IF EXISTS approved_at;
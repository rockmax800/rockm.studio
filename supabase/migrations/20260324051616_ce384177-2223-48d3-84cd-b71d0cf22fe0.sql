
-- Data migration: map old review states to lifecycle + verdict separation
-- Reviews currently in verdict-like states get moved to 'resolved'
UPDATE public.reviews SET state = 'resolved' WHERE state IN ('approved', 'approved_with_notes', 'rejected', 'escalated') AND verdict IS NOT NULL;

-- Approvals: populate decision column from old state values, then set lifecycle to 'decided'
UPDATE public.approvals SET decision = 'approved' WHERE state = 'approved' AND decision IS NULL;
UPDATE public.approvals SET decision = 'rejected' WHERE state = 'rejected' AND decision IS NULL;
UPDATE public.approvals SET decision = 'deferred' WHERE state = 'deferred' AND decision IS NULL;
UPDATE public.approvals SET state = 'decided' WHERE state IN ('approved', 'rejected', 'deferred') AND decision IS NOT NULL;

-- Tasks: rename 'approved' to 'validated'
UPDATE public.tasks SET state = 'validated' WHERE state = 'approved';

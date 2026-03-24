
-- SECTION 1: Add 'resolved' to review_state enum
ALTER TYPE public.review_state ADD VALUE IF NOT EXISTS 'resolved';

-- SECTION 2: Add 'decided' to approval_state enum
ALTER TYPE public.approval_state ADD VALUE IF NOT EXISTS 'decided';

-- SECTION 3: Create approval_decision enum and add decision column
DO $$ BEGIN
  CREATE TYPE public.approval_decision AS ENUM ('approved', 'rejected', 'deferred');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS decision public.approval_decision;

-- SECTION 4: Add 'validated' to task_state enum
ALTER TYPE public.task_state ADD VALUE IF NOT EXISTS 'validated';

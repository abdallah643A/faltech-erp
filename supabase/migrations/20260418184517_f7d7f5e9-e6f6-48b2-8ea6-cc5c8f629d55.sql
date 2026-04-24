-- Extend insurance approvals with multi-stage workflow fields
ALTER TABLE public.hosp_insurance_approvals
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'routine',
  ADD COLUMN IF NOT EXISTS service_category text,
  ADD COLUMN IF NOT EXISTS diagnosis_codes text[],
  ADD COLUMN IF NOT EXISTS procedure_codes text[],
  ADD COLUMN IF NOT EXISTS expected_service_date date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS appeal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Drop the old narrow status check, broaden it
ALTER TABLE public.hosp_insurance_approvals DROP CONSTRAINT IF EXISTS hosp_insurance_approvals_status_check;
ALTER TABLE public.hosp_insurance_approvals
  ADD CONSTRAINT hosp_insurance_approvals_status_check
  CHECK (status = ANY (ARRAY[
    'draft','requested','submitted','insurer_review','medical_review',
    'pending','approved','partial','rejected','appealed','expired','cancelled'
  ]));

-- History / audit log
CREATE TABLE IF NOT EXISTS public.hosp_insurance_approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid NOT NULL REFERENCES public.hosp_insurance_approvals(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  action text NOT NULL, -- 'submit','assign','approve','partial','reject','appeal','expire','cancel','note'
  actor_id uuid,
  actor_name text,
  comments text,
  approved_amount numeric,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insurance_history_approval ON public.hosp_insurance_approval_history(approval_id, created_at DESC);

ALTER TABLE public.hosp_insurance_approval_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hospital staff read insurance history"
  ON public.hosp_insurance_approval_history FOR SELECT TO authenticated
  USING (public.is_hospital_staff(auth.uid()));
CREATE POLICY "Hospital staff write insurance history"
  ON public.hosp_insurance_approval_history FOR INSERT TO authenticated
  WITH CHECK (public.is_hospital_staff(auth.uid()));

-- Trigger: on status change, append history & stamp responded_at on terminal states
CREATE OR REPLACE FUNCTION public.hosp_insurance_track_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status,'') IS DISTINCT FROM COALESCE(NEW.status,'') THEN
    INSERT INTO public.hosp_insurance_approval_history(
      approval_id, from_status, to_status, action, actor_id,
      comments, approved_amount, rejection_reason
    ) VALUES (
      NEW.id, OLD.status, NEW.status,
      CASE NEW.status
        WHEN 'submitted' THEN 'submit'
        WHEN 'approved' THEN 'approve'
        WHEN 'partial' THEN 'partial'
        WHEN 'rejected' THEN 'reject'
        WHEN 'appealed' THEN 'appeal'
        WHEN 'expired' THEN 'expire'
        WHEN 'cancelled' THEN 'cancel'
        ELSE 'transition'
      END,
      auth.uid(), NEW.notes, NEW.approved_amount, NEW.rejection_reason
    );

    IF NEW.status IN ('approved','partial','rejected','expired','cancelled')
       AND NEW.responded_at IS NULL THEN
      NEW.responded_at := now();
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hosp_insurance_track ON public.hosp_insurance_approvals;
CREATE TRIGGER trg_hosp_insurance_track
BEFORE UPDATE ON public.hosp_insurance_approvals
FOR EACH ROW EXECUTE FUNCTION public.hosp_insurance_track_status_change();

-- Validated stage advancement function
CREATE OR REPLACE FUNCTION public.hosp_insurance_advance_stage(
  p_approval_id uuid,
  p_to_status text,
  p_comments text DEFAULT NULL,
  p_approved_amount numeric DEFAULT NULL,
  p_approval_no text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
) RETURNS public.hosp_insurance_approvals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cur RECORD;
  result public.hosp_insurance_approvals;
  allowed boolean := false;
BEGIN
  SELECT * INTO cur FROM public.hosp_insurance_approvals WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval not found';
  END IF;

  -- Allowed transitions
  allowed := CASE
    WHEN cur.status = 'draft'           AND p_to_status IN ('submitted','cancelled') THEN true
    WHEN cur.status = 'submitted'       AND p_to_status IN ('insurer_review','rejected','cancelled') THEN true
    WHEN cur.status = 'insurer_review'  AND p_to_status IN ('medical_review','approved','partial','rejected','pending') THEN true
    WHEN cur.status = 'medical_review'  AND p_to_status IN ('approved','partial','rejected','pending') THEN true
    WHEN cur.status = 'pending'         AND p_to_status IN ('approved','partial','rejected','expired') THEN true
    WHEN cur.status IN ('rejected','partial') AND p_to_status = 'appealed' THEN true
    WHEN cur.status = 'appealed'        AND p_to_status IN ('approved','partial','rejected') THEN true
    WHEN cur.status = 'requested'       AND p_to_status IN ('submitted','insurer_review','approved','partial','rejected','cancelled') THEN true
    ELSE false
  END;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Illegal status transition: % → %', cur.status, p_to_status;
  END IF;

  UPDATE public.hosp_insurance_approvals
  SET status = p_to_status,
      stage = p_to_status,
      approved_amount = COALESCE(p_approved_amount, approved_amount),
      approval_no = COALESCE(p_approval_no, approval_no),
      rejection_reason = COALESCE(p_rejection_reason, rejection_reason),
      notes = CASE WHEN p_comments IS NOT NULL THEN p_comments ELSE notes END,
      appeal_count = CASE WHEN p_to_status = 'appealed' THEN appeal_count + 1 ELSE appeal_count END
  WHERE id = p_approval_id
  RETURNING * INTO result;

  RETURN result;
END $$;
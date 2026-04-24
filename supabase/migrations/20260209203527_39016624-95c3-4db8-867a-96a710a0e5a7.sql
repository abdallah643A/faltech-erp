
-- Add satisfaction_score to project_signoffs
ALTER TABLE public.project_signoffs ADD COLUMN IF NOT EXISTS satisfaction_score integer;

-- Create RPC to complete project after customer sign-off
CREATE OR REPLACE FUNCTION public.complete_project_signoff(
  p_project_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_logistics_phase_id uuid;
  v_completed_phase_id uuid;
BEGIN
  -- Complete logistics phase
  UPDATE project_phases
  SET status = 'completed', completed_at = now()
  WHERE project_id = p_project_id AND phase = 'logistics' AND status = 'in_progress';

  -- Start completed phase
  UPDATE project_phases
  SET status = 'completed', started_at = now(), completed_at = now()
  WHERE project_id = p_project_id AND phase = 'completed' AND status = 'pending';

  -- Update project
  UPDATE projects
  SET current_phase = 'completed', status = 'completed'
  WHERE id = p_project_id;
END;
$$;

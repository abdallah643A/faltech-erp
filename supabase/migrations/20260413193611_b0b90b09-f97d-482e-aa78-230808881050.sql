
-- Add missing columns to cpms_schedule_activities for full planning module
ALTER TABLE public.cpms_schedule_activities
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS level_type text DEFAULT 'task',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS successors jsonb,
  ADD COLUMN IF NOT EXISTS constraint_type text,
  ADD COLUMN IF NOT EXISTS baseline_start date,
  ADD COLUMN IF NOT EXISTS baseline_end date,
  ADD COLUMN IF NOT EXISTS budget_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS dependency_type text DEFAULT 'FS',
  ADD COLUMN IF NOT EXISTS parent_activity_id uuid REFERENCES public.cpms_schedule_activities(id) ON DELETE SET NULL;

-- Add index for parent hierarchy
CREATE INDEX IF NOT EXISTS idx_schedule_activities_parent ON public.cpms_schedule_activities(parent_activity_id);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_level_type ON public.cpms_schedule_activities(level_type);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_status ON public.cpms_schedule_activities(status);
CREATE INDEX IF NOT EXISTS idx_schedule_activities_responsible ON public.cpms_schedule_activities(responsible_user_id);

-- Enable RLS if not already enabled
ALTER TABLE public.cpms_schedule_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for schedule activities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cpms_schedule_activities' AND policyname = 'Authenticated users can view schedule activities') THEN
    CREATE POLICY "Authenticated users can view schedule activities"
      ON public.cpms_schedule_activities FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cpms_schedule_activities' AND policyname = 'Authenticated users can create schedule activities') THEN
    CREATE POLICY "Authenticated users can create schedule activities"
      ON public.cpms_schedule_activities FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cpms_schedule_activities' AND policyname = 'Authenticated users can update schedule activities') THEN
    CREATE POLICY "Authenticated users can update schedule activities"
      ON public.cpms_schedule_activities FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cpms_schedule_activities' AND policyname = 'Authenticated users can delete schedule activities') THEN
    CREATE POLICY "Authenticated users can delete schedule activities"
      ON public.cpms_schedule_activities FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

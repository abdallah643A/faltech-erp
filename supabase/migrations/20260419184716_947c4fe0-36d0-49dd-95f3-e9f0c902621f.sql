-- 1. Lifecycle stages reference table
CREATE TABLE IF NOT EXISTS public.asset_lifecycle_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_code text NOT NULL UNIQUE,
  stage_name text NOT NULL,
  stage_name_ar text,
  display_order integer NOT NULL DEFAULT 0,
  color_hex text DEFAULT '#0066cc',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.asset_lifecycle_stages (stage_code, stage_name, stage_name_ar, display_order, color_hex) VALUES
  ('acquisition', 'Acquisition', 'الاقتناء', 10, '#3b82f6'),
  ('capitalization', 'Capitalization', 'الرسملة', 20, '#6366f1'),
  ('in_service', 'In Service', 'قيد الخدمة', 30, '#1a7a4a'),
  ('assignment', 'Assignment', 'التخصيص', 35, '#0ea5e9'),
  ('maintenance', 'Maintenance', 'الصيانة', 40, '#f59e0b'),
  ('inspection', 'Inspection', 'الفحص', 45, '#8b5cf6'),
  ('transfer', 'Transfer', 'التحويل', 50, '#06b6d4'),
  ('overhaul', 'Overhaul', 'العمرة', 55, '#ec4899'),
  ('idle', 'Idle / Standby', 'متوقف', 60, '#64748b'),
  ('disposal', 'Disposal', 'الاستبعاد', 90, '#ef4444'),
  ('retired', 'Retired', 'متقاعد', 95, '#94a3b8')
ON CONFLICT (stage_code) DO NOTHING;

ALTER TABLE public.asset_lifecycle_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lifecycle stages readable by all authenticated"
  ON public.asset_lifecycle_stages FOR SELECT TO authenticated USING (true);

-- 2. Unified lifecycle events timeline
CREATE TABLE IF NOT EXISTS public.asset_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  asset_id uuid,
  equipment_id uuid,
  stage_code text NOT NULL,
  event_type text NOT NULL,
  event_date timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'completed',
  source_table text,
  source_record_id uuid,
  financial_impact numeric DEFAULT 0,
  currency text DEFAULT 'SAR',
  actor_user_id uuid,
  actor_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_asset ON public.asset_lifecycle_events(asset_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_equipment ON public.asset_lifecycle_events(equipment_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_company ON public.asset_lifecycle_events(company_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_stage ON public.asset_lifecycle_events(stage_code);

ALTER TABLE public.asset_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view lifecycle events"
  ON public.asset_lifecycle_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users insert lifecycle events"
  ON public.asset_lifecycle_events FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users update lifecycle events"
  ON public.asset_lifecycle_events FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Creators delete own lifecycle events"
  ON public.asset_lifecycle_events FOR DELETE TO authenticated USING (created_by = auth.uid());

-- 3. Add current stage + health score to existing asset tables
ALTER TABLE public.cpms_equipment
  ADD COLUMN IF NOT EXISTS current_lifecycle_stage text DEFAULT 'in_service',
  ADD COLUMN IF NOT EXISTS lifecycle_health_score numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS lifecycle_last_event_at timestamptz;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS current_lifecycle_stage text DEFAULT 'in_service',
  ADD COLUMN IF NOT EXISTS lifecycle_health_score numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS lifecycle_last_event_at timestamptz;

-- 4. Helper function to log a lifecycle event and bump asset stage
CREATE OR REPLACE FUNCTION public.log_asset_lifecycle_event(
  p_asset_id uuid,
  p_equipment_id uuid,
  p_company_id uuid,
  p_stage_code text,
  p_event_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_source_table text DEFAULT NULL,
  p_source_record_id uuid DEFAULT NULL,
  p_financial_impact numeric DEFAULT 0,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.asset_lifecycle_events (
    company_id, asset_id, equipment_id, stage_code, event_type,
    title, description, source_table, source_record_id,
    financial_impact, metadata, actor_user_id, created_by
  ) VALUES (
    p_company_id, p_asset_id, p_equipment_id, p_stage_code, p_event_type,
    p_title, p_description, p_source_table, p_source_record_id,
    p_financial_impact, p_metadata, auth.uid(), auth.uid()
  ) RETURNING id INTO v_event_id;

  IF p_equipment_id IS NOT NULL THEN
    UPDATE public.cpms_equipment
    SET current_lifecycle_stage = p_stage_code,
        lifecycle_last_event_at = now()
    WHERE id = p_equipment_id;
  END IF;

  IF p_asset_id IS NOT NULL THEN
    UPDATE public.assets
    SET current_lifecycle_stage = p_stage_code,
        lifecycle_last_event_at = now()
    WHERE id = p_asset_id;
  END IF;

  RETURN v_event_id;
END;
$$;
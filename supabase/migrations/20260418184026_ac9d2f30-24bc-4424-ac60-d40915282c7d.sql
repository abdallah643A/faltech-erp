-- ─── Hospital Equipment + Downtime ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hosp_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code text UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general', -- 'or', 'radiology', 'icu', 'lab', 'general'
  modality text, -- e.g. 'CT', 'MRI', 'XRAY', 'USG', 'ANESTHESIA', 'VENTILATOR'
  location_type text, -- 'or_room', 'radiology_room', 'ward', 'icu'
  location_id uuid, -- references hosp_rooms.id when applicable
  fixed_asset_id uuid, -- optional link to ERP fixed_assets table
  serial_number text,
  manufacturer text,
  model text,
  status text NOT NULL DEFAULT 'available', -- available | in_use | maintenance | down | retired
  last_maintenance_at timestamptz,
  next_maintenance_due timestamptz,
  calibration_due timestamptz,
  notes text,
  company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hosp_equipment_status ON public.hosp_equipment(status);
CREATE INDEX IF NOT EXISTS idx_hosp_equipment_category ON public.hosp_equipment(category);
CREATE INDEX IF NOT EXISTS idx_hosp_equipment_location ON public.hosp_equipment(location_type, location_id);

CREATE TABLE IF NOT EXISTS public.hosp_equipment_downtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.hosp_equipment(id) ON DELETE CASCADE,
  reason text NOT NULL, -- 'maintenance' | 'breakdown' | 'calibration' | 'cleaning' | 'other'
  severity text NOT NULL DEFAULT 'planned', -- 'planned' | 'unplanned' | 'critical'
  starts_at timestamptz NOT NULL,
  ends_at timestamptz, -- null = ongoing
  description text,
  reported_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  work_order_ref text,
  company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hosp_eq_downtime_equipment ON public.hosp_equipment_downtime(equipment_id);
CREATE INDEX IF NOT EXISTS idx_hosp_eq_downtime_active ON public.hosp_equipment_downtime(equipment_id, starts_at, ends_at);

ALTER TABLE public.hosp_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hosp_equipment_downtime ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read equipment" ON public.hosp_equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write equipment" ON public.hosp_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated read downtime" ON public.hosp_equipment_downtime FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write downtime" ON public.hosp_equipment_downtime FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-update equipment.status when downtime opens/closes
CREATE OR REPLACE FUNCTION public.hosp_equipment_apply_downtime()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Active downtime now?
    IF NEW.starts_at <= now() AND (NEW.ends_at IS NULL OR NEW.ends_at > now()) AND NEW.resolved_at IS NULL THEN
      UPDATE public.hosp_equipment
      SET status = CASE
        WHEN NEW.reason = 'maintenance' OR NEW.reason = 'calibration' THEN 'maintenance'
        ELSE 'down'
      END,
      updated_at = now()
      WHERE id = NEW.equipment_id;
    ELSIF NEW.resolved_at IS NOT NULL OR (NEW.ends_at IS NOT NULL AND NEW.ends_at <= now()) THEN
      -- Restore only if no other active downtime exists
      IF NOT EXISTS (
        SELECT 1 FROM public.hosp_equipment_downtime
        WHERE equipment_id = NEW.equipment_id
          AND id <> NEW.id
          AND resolved_at IS NULL
          AND starts_at <= now()
          AND (ends_at IS NULL OR ends_at > now())
      ) THEN
        UPDATE public.hosp_equipment
        SET status = 'available', updated_at = now()
        WHERE id = NEW.equipment_id AND status IN ('maintenance','down');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_hosp_equipment_apply_downtime ON public.hosp_equipment_downtime;
CREATE TRIGGER trg_hosp_equipment_apply_downtime
AFTER INSERT OR UPDATE ON public.hosp_equipment_downtime
FOR EACH ROW EXECUTE FUNCTION public.hosp_equipment_apply_downtime();

-- Availability check function used by OR/Radiology scheduling
CREATE OR REPLACE FUNCTION public.hosp_equipment_check_availability(
  p_equipment_id uuid,
  p_start timestamptz,
  p_end timestamptz
) RETURNS TABLE(available boolean, conflict_reason text, conflict_severity text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  eq RECORD;
  dt RECORD;
BEGIN
  SELECT * INTO eq FROM public.hosp_equipment WHERE id = p_equipment_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Equipment not found'::text, 'critical'::text; RETURN;
  END IF;
  IF eq.status = 'retired' THEN
    RETURN QUERY SELECT false, 'Equipment is retired'::text, 'critical'::text; RETURN;
  END IF;

  -- Overlap with any unresolved downtime
  SELECT * INTO dt FROM public.hosp_equipment_downtime
  WHERE equipment_id = p_equipment_id
    AND resolved_at IS NULL
    AND starts_at < p_end
    AND (ends_at IS NULL OR ends_at > p_start)
  ORDER BY severity DESC, starts_at LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT false,
      ('Downtime: ' || dt.reason || COALESCE(' — ' || dt.description, ''))::text,
      dt.severity::text;
    RETURN;
  END IF;

  -- Calibration overdue is a soft warning
  IF eq.calibration_due IS NOT NULL AND eq.calibration_due < now() THEN
    RETURN QUERY SELECT true, 'Calibration overdue'::text, 'warning'::text; RETURN;
  END IF;
  IF eq.next_maintenance_due IS NOT NULL AND eq.next_maintenance_due < now() THEN
    RETURN QUERY SELECT true, 'Maintenance overdue'::text, 'warning'::text; RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text, NULL::text;
END $$;

-- Add equipment_id to surgeries and radiology orders for scheduling traceability
ALTER TABLE public.hosp_surgeries ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES public.hosp_equipment(id);
ALTER TABLE public.hosp_radiology_orders ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES public.hosp_equipment(id);
CREATE INDEX IF NOT EXISTS idx_hosp_surgeries_equipment ON public.hosp_surgeries(equipment_id);
CREATE INDEX IF NOT EXISTS idx_hosp_radiology_equipment ON public.hosp_radiology_orders(equipment_id);

-- Touch updated_at
CREATE TRIGGER trg_hosp_equipment_updated BEFORE UPDATE ON public.hosp_equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hosp_eq_downtime_updated BEFORE UPDATE ON public.hosp_equipment_downtime FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
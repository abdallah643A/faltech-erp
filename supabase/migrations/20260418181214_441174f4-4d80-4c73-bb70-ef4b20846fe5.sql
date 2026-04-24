
-- =========================================================================
-- HOSPITAL ↔ ERP INTEGRATION LAYER (Phase 3)
-- =========================================================================

-- 1. SURGERY CONSUMABLES (links surgery to inventory items)
CREATE TABLE IF NOT EXISTS public.hosp_surgery_consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id UUID NOT NULL REFERENCES public.hosp_surgeries(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id),
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  inventory_item_id UUID REFERENCES public.items(id),
  item_code TEXT,
  item_description TEXT NOT NULL,
  warehouse_code TEXT,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (qty * COALESCE(unit_price, 0)) STORED,
  is_implant BOOLEAN DEFAULT false,
  serial_no TEXT,
  batch_no TEXT,
  used_at TIMESTAMPTZ DEFAULT now(),
  used_by UUID,
  goods_issue_id UUID,
  charge_id UUID REFERENCES public.hosp_encounter_charges(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hosp_surgery_consumables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hosp_surg_cons_select" ON public.hosp_surgery_consumables FOR SELECT TO authenticated USING (is_hospital_staff(auth.uid()));
CREATE POLICY "hosp_surg_cons_insert" ON public.hosp_surgery_consumables FOR INSERT TO authenticated WITH CHECK (is_hospital_staff(auth.uid()));
CREATE POLICY "hosp_surg_cons_update" ON public.hosp_surgery_consumables FOR UPDATE TO authenticated USING (is_hospital_staff(auth.uid()));
CREATE POLICY "hosp_surg_cons_delete" ON public.hosp_surgery_consumables FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role,'hospital_admin'::app_role]));
CREATE INDEX idx_hosp_surg_cons_surgery ON public.hosp_surgery_consumables(surgery_id);
CREATE INDEX idx_hosp_surg_cons_enc ON public.hosp_surgery_consumables(encounter_id);

-- 2. STOCK ALERTS (low-stock notifications for hospital stores)
CREATE TABLE IF NOT EXISTS public.hosp_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES public.items(id),
  item_code TEXT NOT NULL,
  item_description TEXT,
  warehouse_code TEXT,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock','out_of_stock','reorder_point','expired')),
  current_qty NUMERIC,
  reorder_point NUMERIC,
  source_dept TEXT,
  source_id UUID,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','acknowledged','mr_created','resolved')),
  material_request_id UUID REFERENCES public.material_requests(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.hosp_stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hosp_stock_alerts_select" ON public.hosp_stock_alerts FOR SELECT TO authenticated USING (is_hospital_staff(auth.uid()));
CREATE POLICY "hosp_stock_alerts_insert" ON public.hosp_stock_alerts FOR INSERT TO authenticated WITH CHECK (is_hospital_staff(auth.uid()));
CREATE POLICY "hosp_stock_alerts_update" ON public.hosp_stock_alerts FOR UPDATE TO authenticated USING (is_hospital_staff(auth.uid()));

-- 3. NURSING TASKS
CREATE TABLE IF NOT EXISTS public.hosp_nursing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.hosp_patients(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('medication','vitals','procedure','assessment','intake_output','handover','other')),
  description TEXT NOT NULL,
  source_order_id UUID,
  source_type TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','overdue','skipped')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  ward_id UUID REFERENCES public.hosp_wards(id),
  bed_id UUID REFERENCES public.hosp_beds(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hosp_nursing_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hosp_nursing_tasks_select" ON public.hosp_nursing_tasks FOR SELECT TO authenticated USING (is_hospital_staff(auth.uid()));
CREATE POLICY "hosp_nursing_tasks_insert" ON public.hosp_nursing_tasks FOR INSERT TO authenticated WITH CHECK (is_hospital_staff(auth.uid()));
CREATE POLICY "hosp_nursing_tasks_update" ON public.hosp_nursing_tasks FOR UPDATE TO authenticated USING (is_hospital_staff(auth.uid()));
CREATE INDEX idx_hosp_nurs_tasks_enc ON public.hosp_nursing_tasks(encounter_id);
CREATE INDEX idx_hosp_nurs_tasks_status ON public.hosp_nursing_tasks(status);

-- 4. DISCHARGE CHECKLIST ITEMS
CREATE TABLE IF NOT EXISTS public.hosp_discharge_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discharge_id UUID NOT NULL REFERENCES public.hosp_discharges(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.hosp_encounters(id),
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  required BOOLEAN DEFAULT true,
  is_done BOOLEAN DEFAULT false,
  done_by UUID,
  done_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hosp_discharge_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hosp_disc_chk_select" ON public.hosp_discharge_checklist FOR SELECT TO authenticated USING (is_hospital_staff(auth.uid()));
CREATE POLICY "hosp_disc_chk_insert" ON public.hosp_discharge_checklist FOR INSERT TO authenticated WITH CHECK (is_hospital_staff(auth.uid()));
CREATE POLICY "hosp_disc_chk_update" ON public.hosp_discharge_checklist FOR UPDATE TO authenticated USING (is_hospital_staff(auth.uid()));

-- =========================================================================
-- TRIGGERS: Hospital → ERP integration
-- =========================================================================

-- 5. Auto-create encounter charge when pharmacy dispense is created
CREATE OR REPLACE FUNCTION public.hosp_dispense_create_charge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_drug_name TEXT;
BEGIN
  SELECT drug_name INTO v_drug_name FROM hosp_medication_order_lines WHERE id = NEW.order_line_id;
  
  INSERT INTO public.hosp_encounter_charges
    (encounter_id, patient_id, description, source_type, source_id, qty, unit_price, charged_by, notes)
  VALUES
    (NEW.encounter_id, NEW.patient_id, COALESCE(v_drug_name,'Medication'), 'medication', NEW.id,
     NEW.qty, COALESCE(NEW.unit_price,0), NEW.dispensed_by,
     'Auto: pharmacy dispense ' || NEW.id::text);
  
  -- update line dispensed_qty
  UPDATE hosp_medication_order_lines
    SET dispensed_qty = COALESCE(dispensed_qty,0) + NEW.qty,
        status = CASE WHEN COALESCE(dispensed_qty,0) + NEW.qty >= quantity THEN 'dispensed' ELSE 'partial' END
  WHERE id = NEW.order_line_id;
  
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hosp_dispense_charge ON public.hosp_pharmacy_dispenses;
CREATE TRIGGER trg_hosp_dispense_charge AFTER INSERT ON public.hosp_pharmacy_dispenses
FOR EACH ROW EXECUTE FUNCTION public.hosp_dispense_create_charge();

-- 6. Auto-create goods issue movement & decrement stock when pharmacy dispense links to inventory_item_id
CREATE OR REPLACE FUNCTION public.hosp_dispense_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item RECORD;
  v_issue_id UUID;
  v_doc_num INT;
  v_alert_id UUID;
BEGIN
  IF NEW.inventory_item_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT * INTO v_item FROM public.items WHERE id = NEW.inventory_item_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  
  -- create goods issue header
  SELECT COALESCE(MAX(doc_num),0)+1 INTO v_doc_num FROM public.inventory_goods_issues;
  INSERT INTO public.inventory_goods_issues
    (doc_num, doc_date, posting_date, reference_no, warehouse_code, reason, remarks, status, created_by, total)
  VALUES
    (v_doc_num, CURRENT_DATE, CURRENT_DATE, 'PHARM-DISP-' || NEW.id::text,
     COALESCE(NEW.warehouse_code, v_item.warehouse, 'WH01'),
     'Pharmacy Dispense', 'Hospital pharmacy dispense for patient ' || NEW.patient_id::text,
     'closed', NEW.dispensed_by, COALESCE(NEW.unit_price,0) * NEW.qty)
  RETURNING id INTO v_issue_id;
  
  -- line
  INSERT INTO public.inventory_goods_issue_lines
    (issue_id, line_num, item_code, item_description, quantity, unit_price, line_total, unit, serial_batch_no)
  VALUES
    (v_issue_id, 1, v_item.item_code, v_item.description, NEW.qty,
     COALESCE(NEW.unit_price,0), COALESCE(NEW.unit_price,0) * NEW.qty, v_item.uom, NULL);
  
  -- decrement stock
  UPDATE public.items
    SET in_stock = GREATEST(0, COALESCE(in_stock,0) - NEW.qty::int),
        updated_at = now()
  WHERE id = NEW.inventory_item_id;
  
  -- check reorder point → create stock alert
  IF (v_item.in_stock - NEW.qty::int) <= COALESCE(v_item.reorder_point, 0) AND COALESCE(v_item.reorder_point,0) > 0 THEN
    INSERT INTO public.hosp_stock_alerts
      (inventory_item_id, item_code, item_description, warehouse_code, alert_type,
       current_qty, reorder_point, source_dept, source_id, status)
    VALUES
      (NEW.inventory_item_id, v_item.item_code, v_item.description,
       COALESCE(NEW.warehouse_code, v_item.warehouse),
       CASE WHEN (v_item.in_stock - NEW.qty::int) <= 0 THEN 'out_of_stock' ELSE 'reorder_point' END,
       v_item.in_stock - NEW.qty::int, v_item.reorder_point,
       'pharmacy', NEW.id, 'open');
  END IF;
  
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hosp_dispense_stock ON public.hosp_pharmacy_dispenses;
CREATE TRIGGER trg_hosp_dispense_stock AFTER INSERT ON public.hosp_pharmacy_dispenses
FOR EACH ROW EXECUTE FUNCTION public.hosp_dispense_stock_movement();

-- 7. Auto-create encounter charge when LAB result is released
CREATE OR REPLACE FUNCTION public.hosp_lab_charge_on_release()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('reported','released','validated') AND
     (OLD.status IS NULL OR OLD.status NOT IN ('reported','released','validated')) THEN
    -- avoid duplicate
    IF NOT EXISTS (SELECT 1 FROM hosp_encounter_charges WHERE source_type='lab' AND source_id = NEW.id) THEN
      INSERT INTO public.hosp_encounter_charges
        (encounter_id, patient_id, description, source_type, source_id, qty, unit_price, notes)
      VALUES
        (NEW.encounter_id, NEW.patient_id, NEW.test_name, 'lab', NEW.id,
         1, COALESCE(NEW.unit_price,0),
         'Auto: lab order ' || NEW.order_no);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hosp_lab_charge ON public.hosp_lab_orders;
CREATE TRIGGER trg_hosp_lab_charge AFTER UPDATE ON public.hosp_lab_orders
FOR EACH ROW EXECUTE FUNCTION public.hosp_lab_charge_on_release();

-- 8. Auto-create encounter charge when RADIOLOGY report is finalized
CREATE OR REPLACE FUNCTION public.hosp_rad_charge_on_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.report_text IS NOT NULL AND (OLD.report_text IS NULL OR OLD.report_text = '') THEN
    IF NOT EXISTS (SELECT 1 FROM hosp_encounter_charges WHERE source_type='radiology' AND source_id = NEW.id) THEN
      INSERT INTO public.hosp_encounter_charges
        (encounter_id, patient_id, description, source_type, source_id, qty, unit_price, notes)
      VALUES
        (NEW.encounter_id, NEW.patient_id, NEW.exam_name, 'radiology', NEW.id,
         1, COALESCE(NEW.unit_price,0),
         'Auto: radiology order ' || NEW.order_no);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hosp_rad_charge ON public.hosp_radiology_orders;
CREATE TRIGGER trg_hosp_rad_charge AFTER UPDATE ON public.hosp_radiology_orders
FOR EACH ROW EXECUTE FUNCTION public.hosp_rad_charge_on_report();

-- 9. Surgery consumable → goods issue + charge
CREATE OR REPLACE FUNCTION public.hosp_surgery_consumable_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item RECORD;
  v_issue_id UUID;
  v_charge_id UUID;
  v_doc_num INT;
BEGIN
  -- Charge
  INSERT INTO public.hosp_encounter_charges
    (encounter_id, patient_id, description, source_type, source_id, qty, unit_price, charged_by, notes)
  VALUES
    (NEW.encounter_id, NEW.patient_id,
     NEW.item_description || CASE WHEN NEW.is_implant THEN ' (Implant)' ELSE '' END,
     'surgery', NEW.id, NEW.qty, COALESCE(NEW.unit_price,0), NEW.used_by,
     'Auto: surgery ' || NEW.surgery_id::text)
  RETURNING id INTO v_charge_id;
  
  NEW.charge_id := v_charge_id;
  
  -- Stock issue if item linked
  IF NEW.inventory_item_id IS NOT NULL THEN
    SELECT * INTO v_item FROM public.items WHERE id = NEW.inventory_item_id;
    IF FOUND THEN
      SELECT COALESCE(MAX(doc_num),0)+1 INTO v_doc_num FROM public.inventory_goods_issues;
      INSERT INTO public.inventory_goods_issues
        (doc_num, doc_date, posting_date, reference_no, warehouse_code, reason, remarks, status, created_by, total)
      VALUES
        (v_doc_num, CURRENT_DATE, CURRENT_DATE, 'OR-CONS-' || NEW.id::text,
         COALESCE(NEW.warehouse_code, v_item.warehouse, 'WH01'),
         'OR Consumable', 'Surgery consumable usage',
         'closed', NEW.used_by, COALESCE(NEW.unit_price,0) * NEW.qty)
      RETURNING id INTO v_issue_id;
      
      INSERT INTO public.inventory_goods_issue_lines
        (issue_id, line_num, item_code, item_description, quantity, unit_price, line_total, unit, serial_batch_no)
      VALUES
        (v_issue_id, 1, v_item.item_code, v_item.description, NEW.qty,
         COALESCE(NEW.unit_price,0), COALESCE(NEW.unit_price,0) * NEW.qty, v_item.uom,
         COALESCE(NEW.serial_no, NEW.batch_no));
      
      NEW.goods_issue_id := v_issue_id;
      
      UPDATE public.items
        SET in_stock = GREATEST(0, COALESCE(in_stock,0) - NEW.qty::int),
            updated_at = now()
      WHERE id = NEW.inventory_item_id;
    END IF;
  END IF;
  
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hosp_surg_cons_post ON public.hosp_surgery_consumables;
CREATE TRIGGER trg_hosp_surg_cons_post BEFORE INSERT ON public.hosp_surgery_consumables
FOR EACH ROW EXECUTE FUNCTION public.hosp_surgery_consumable_post();

-- 10. Convert open stock alert → material request
CREATE OR REPLACE FUNCTION public.hosp_create_mr_from_alert(p_alert_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_alert RECORD;
  v_mr_id UUID;
  v_mr_num TEXT;
BEGIN
  SELECT * INTO v_alert FROM public.hosp_stock_alerts WHERE id = p_alert_id AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'Alert not found or already processed'; END IF;
  
  v_mr_num := 'MR-HOSP-' || TO_CHAR(now(),'YYYYMMDD') || '-' || LPAD((EXTRACT(EPOCH FROM now())::bigint % 100000)::text, 5, '0');
  
  INSERT INTO public.material_requests
    (mr_number, request_date, department, status, requested_by_id, requested_by_name,
     project_name, category, requested_at)
  VALUES
    (v_mr_num, CURRENT_DATE, 'Hospital ' || COALESCE(v_alert.source_dept,'Stores'),
     'pending', auth.uid(),
     (SELECT full_name FROM profiles WHERE user_id = auth.uid()),
     'Hospital Replenishment', 'medical', now())
  RETURNING id INTO v_mr_id;
  
  INSERT INTO public.material_request_lines
    (material_request_id, line_num, part_no, description, unit_of_measurement, quantity, remark)
  VALUES
    (v_mr_id, 1, v_alert.item_code, v_alert.item_description, 'EA',
     GREATEST(v_alert.reorder_point * 2, 10),
     'Auto from hospital low-stock alert');
  
  UPDATE public.hosp_stock_alerts
    SET status = 'mr_created', material_request_id = v_mr_id
  WHERE id = p_alert_id;
  
  RETURN v_mr_id;
END $$;

-- 11. Default discharge checklist seeder
CREATE OR REPLACE FUNCTION public.hosp_seed_discharge_checklist()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.hosp_discharge_checklist (discharge_id, encounter_id, item_key, item_label, required) VALUES
    (NEW.id, NEW.encounter_id, 'doctor_summary',  'Doctor discharge summary',     true),
    (NEW.id, NEW.encounter_id, 'nursing_clearance','Nursing clearance & handover', true),
    (NEW.id, NEW.encounter_id, 'pharmacy_clear',  'Pharmacy clearance / take-home meds', true),
    (NEW.id, NEW.encounter_id, 'billing_clear',   'Billing & payment clearance',  true),
    (NEW.id, NEW.encounter_id, 'followup',        'Follow-up appointment scheduled', false),
    (NEW.id, NEW.encounter_id, 'docs_handover',   'Documents / reports handed to patient', true);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hosp_seed_disc_chk ON public.hosp_discharges;
CREATE TRIGGER trg_hosp_seed_disc_chk AFTER INSERT ON public.hosp_discharges
FOR EACH ROW EXECUTE FUNCTION public.hosp_seed_discharge_checklist();

-- 12. Helper function: full patient timeline (RPC for Patient 360)
CREATE OR REPLACE FUNCTION public.hosp_patient_timeline(p_patient_id UUID)
RETURNS TABLE (
  event_at TIMESTAMPTZ,
  event_type TEXT,
  event_category TEXT,
  title TEXT,
  subtitle TEXT,
  reference_id UUID,
  encounter_id UUID,
  meta JSONB
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT created_at, 'encounter','clinical', encounter_type || ' • ' || encounter_no,
         COALESCE(chief_complaint, status), id, id,
         jsonb_build_object('status',status,'department',department,'doctor',doctor_name)
    FROM hosp_encounters WHERE patient_id = p_patient_id
  UNION ALL
  SELECT charged_at, 'charge','billing', description,
         source_type || ' • ' || amount::text, id, encounter_id,
         jsonb_build_object('amount',amount,'qty',qty,'source',source_type)
    FROM hosp_encounter_charges WHERE patient_id = p_patient_id
  UNION ALL
  SELECT ordered_at, 'lab_order','diagnostic', test_name,
         priority || ' • ' || status, id, encounter_id,
         jsonb_build_object('status',status,'priority',priority,'critical',is_critical)
    FROM hosp_lab_orders WHERE patient_id = p_patient_id
  UNION ALL
  SELECT ordered_at, 'rad_order','diagnostic', exam_name,
         COALESCE(modality,'') || ' • ' || status, id, encounter_id,
         jsonb_build_object('status',status,'priority',priority)
    FROM hosp_radiology_orders WHERE patient_id = p_patient_id
  UNION ALL
  SELECT prescribed_at, 'prescription','medication', 'Prescription ' || prescription_no,
         status || CASE WHEN is_stat THEN ' • STAT' ELSE '' END, id, encounter_id,
         jsonb_build_object('status',status,'controlled',is_controlled)
    FROM hosp_medication_orders WHERE patient_id = p_patient_id
  UNION ALL
  SELECT dispensed_at, 'dispense','medication', 'Dispensed: qty ' || qty::text,
         'pharmacy', id, encounter_id,
         jsonb_build_object('qty',qty,'total',total)
    FROM hosp_pharmacy_dispenses WHERE patient_id = p_patient_id
  UNION ALL
  SELECT COALESCE(scheduled_at, created_at), 'surgery','clinical', procedure_name,
         status || ' • ' || COALESCE(ot_room,''), id, encounter_id,
         jsonb_build_object('status',status,'surgeon',surgeon_name)
    FROM hosp_surgeries WHERE patient_id = p_patient_id
  UNION ALL
  SELECT created_at, 'invoice','billing', 'Invoice ' || invoice_no,
         status || ' • ' || total::text, id, encounter_id,
         jsonb_build_object('status',status,'total',total,'balance',balance)
    FROM hosp_invoices WHERE patient_id = p_patient_id
  ORDER BY 1 DESC;
$$;

-- 13. Indexes
CREATE INDEX IF NOT EXISTS idx_hosp_charges_source ON public.hosp_encounter_charges(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_hosp_lab_status ON public.hosp_lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_hosp_rad_status ON public.hosp_radiology_orders(status);

-- ============================================================
-- Accounting foundation: periods, numbering, JE governance,
-- recurring JEs, intercompany, consolidation, posting log
-- ============================================================

-- ---------- 1. Periods ----------
CREATE TABLE IF NOT EXISTS public.acct_periods (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID,
  fiscal_year   INTEGER NOT NULL,
  period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 12),
  period_name   TEXT NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','soft_closed','closed')),
  closed_at     TIMESTAMPTZ,
  closed_by     UUID,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, fiscal_year, period_number)
);
CREATE INDEX IF NOT EXISTS idx_acct_periods_dates ON public.acct_periods(company_id, start_date, end_date);
ALTER TABLE public.acct_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acct_periods_all" ON public.acct_periods;
CREATE POLICY "acct_periods_all" ON public.acct_periods FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS tg_acct_periods_updated ON public.acct_periods;
CREATE TRIGGER tg_acct_periods_updated BEFORE UPDATE ON public.acct_periods
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- 2. Period-close checklist ----------
CREATE TABLE IF NOT EXISTS public.acct_period_close_checklist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id    UUID NOT NULL REFERENCES public.acct_periods(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  task_title   TEXT NOT NULL,
  task_title_ar TEXT,
  description  TEXT,
  owner_id     UUID,
  owner_name   TEXT,
  due_date     DATE,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','in_progress','completed','blocked','skipped')),
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  notes        TEXT,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_close_checklist_period ON public.acct_period_close_checklist(period_id, sort_order);
ALTER TABLE public.acct_period_close_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "close_checklist_all" ON public.acct_period_close_checklist;
CREATE POLICY "close_checklist_all" ON public.acct_period_close_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS tg_close_checklist_updated ON public.acct_period_close_checklist;
CREATE TRIGGER tg_close_checklist_updated BEFORE UPDATE ON public.acct_period_close_checklist
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- 3. Numbering series ----------
CREATE TABLE IF NOT EXISTS public.acct_numbering_series (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID,
  doc_type     TEXT NOT NULL,
  series_name  TEXT NOT NULL,
  prefix       TEXT,
  suffix       TEXT,
  next_number  BIGINT NOT NULL DEFAULT 1,
  first_number BIGINT NOT NULL DEFAULT 1,
  last_number  BIGINT,
  pad_length   INTEGER NOT NULL DEFAULT 6,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  is_locked    BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  fiscal_year  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, doc_type, series_name)
);
ALTER TABLE public.acct_numbering_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "numbering_all" ON public.acct_numbering_series;
CREATE POLICY "numbering_all" ON public.acct_numbering_series FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS tg_numbering_updated ON public.acct_numbering_series;
CREATE TRIGGER tg_numbering_updated BEFORE UPDATE ON public.acct_numbering_series
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Atomic next-number allocator
CREATE OR REPLACE FUNCTION public.acct_alloc_next_number(p_series_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row RECORD;
  v_num BIGINT;
  v_str TEXT;
BEGIN
  UPDATE public.acct_numbering_series
     SET next_number = next_number + 1
   WHERE id = p_series_id AND is_active AND NOT is_locked
   RETURNING next_number - 1, prefix, suffix, pad_length, last_number INTO v_num, v_row.prefix, v_row.suffix, v_row.pad_length, v_row.last_number;
  IF v_num IS NULL THEN
    RAISE EXCEPTION 'Numbering series not found, locked, or inactive';
  END IF;
  IF v_row.last_number IS NOT NULL AND v_num > v_row.last_number THEN
    RAISE EXCEPTION 'Numbering series exhausted (range exceeded)';
  END IF;
  v_str := COALESCE(v_row.prefix,'') || LPAD(v_num::TEXT, v_row.pad_length, '0') || COALESCE(v_row.suffix,'');
  RETURN v_str;
END $$;

-- ---------- 4. Recurring JE templates ----------
CREATE TABLE IF NOT EXISTS public.acct_recurring_je_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID,
  template_name TEXT NOT NULL,
  description   TEXT,
  frequency     TEXT NOT NULL CHECK (frequency IN ('monthly','quarterly','semi_annual','yearly')),
  start_date    DATE NOT NULL,
  end_date      DATE,
  next_run_date DATE NOT NULL,
  last_run_date DATE,
  last_run_je_id UUID,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  auto_post     BOOLEAN NOT NULL DEFAULT false,
  total_runs    INTEGER NOT NULL DEFAULT 0,
  max_runs      INTEGER,
  reference_template TEXT,
  memo          TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rec_je_next ON public.acct_recurring_je_templates(next_run_date) WHERE is_active;
ALTER TABLE public.acct_recurring_je_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rec_je_tmpl_all" ON public.acct_recurring_je_templates;
CREATE POLICY "rec_je_tmpl_all" ON public.acct_recurring_je_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS tg_rec_je_tmpl_updated ON public.acct_recurring_je_templates;
CREATE TRIGGER tg_rec_je_tmpl_updated BEFORE UPDATE ON public.acct_recurring_je_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.acct_recurring_je_lines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID NOT NULL REFERENCES public.acct_recurring_je_templates(id) ON DELETE CASCADE,
  line_num     INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT,
  debit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_center  TEXT,
  project_code TEXT,
  dimension_1  TEXT,
  dimension_2  TEXT,
  dimension_3  TEXT,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.acct_recurring_je_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rec_je_lines_all" ON public.acct_recurring_je_lines;
CREATE POLICY "rec_je_lines_all" ON public.acct_recurring_je_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- 5. Intercompany links ----------
CREATE TABLE IF NOT EXISTS public.acct_intercompany_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_je_id    UUID NOT NULL,
  origin_company_id  UUID NOT NULL,
  mirror_je_id    UUID,
  mirror_company_id  UUID NOT NULL,
  total_amount    NUMERIC(18,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'SAR',
  link_type       TEXT NOT NULL DEFAULT 'auto_mirror'
                  CHECK (link_type IN ('auto_mirror','manual','allocation')),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','reversed','reconciled')),
  reconciled_at   TIMESTAMPTZ,
  reconciled_by   UUID,
  notes           TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ic_origin ON public.acct_intercompany_links(origin_company_id, origin_je_id);
CREATE INDEX IF NOT EXISTS idx_ic_mirror ON public.acct_intercompany_links(mirror_company_id, mirror_je_id);
ALTER TABLE public.acct_intercompany_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ic_links_all" ON public.acct_intercompany_links;
CREATE POLICY "ic_links_all" ON public.acct_intercompany_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS tg_ic_links_updated ON public.acct_intercompany_links;
CREATE TRIGGER tg_ic_links_updated BEFORE UPDATE ON public.acct_intercompany_links
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- 6. Consolidation eliminations ----------
CREATE TABLE IF NOT EXISTS public.acct_consolidation_eliminations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_run_id UUID,
  fiscal_year        INTEGER NOT NULL,
  period_number      INTEGER,
  elimination_type   TEXT NOT NULL
                     CHECK (elimination_type IN ('ic_revenue','ic_cogs','ic_ar_ap','ic_loan','investment','other')),
  description        TEXT,
  origin_company_id  UUID,
  partner_company_id UUID,
  account_code       TEXT NOT NULL,
  debit_amount       NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
  source_link_id     UUID REFERENCES public.acct_intercompany_links(id),
  created_by         UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_elim_period ON public.acct_consolidation_eliminations(fiscal_year, period_number);
ALTER TABLE public.acct_consolidation_eliminations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "elim_all" ON public.acct_consolidation_eliminations;
CREATE POLICY "elim_all" ON public.acct_consolidation_eliminations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------- 7. Posting log (append-only) ----------
CREATE TABLE IF NOT EXISTS public.acct_posting_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID,
  je_id         UUID,
  doc_number    TEXT,
  action        TEXT NOT NULL
                CHECK (action IN ('post','reverse','period_lock','period_unlock','period_close','period_reopen','recurring_run','intercompany_mirror')),
  posting_date  DATE,
  total_debit   NUMERIC(18,2),
  total_credit  NUMERIC(18,2),
  is_balanced   BOOLEAN,
  performed_by  UUID,
  performed_by_name TEXT,
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason        TEXT,
  metadata      JSONB
);
CREATE INDEX IF NOT EXISTS idx_post_log_je ON public.acct_posting_log(je_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_log_company ON public.acct_posting_log(company_id, performed_at DESC);
ALTER TABLE public.acct_posting_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_log_select" ON public.acct_posting_log;
CREATE POLICY "post_log_select" ON public.acct_posting_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "post_log_insert" ON public.acct_posting_log;
CREATE POLICY "post_log_insert" ON public.acct_posting_log FOR INSERT TO authenticated WITH CHECK (true);
-- no UPDATE/DELETE → append-only

-- ============================================================
-- Hard enforcement triggers on finance_journal_entries
-- ============================================================

-- Helper: find period by date + company
CREATE OR REPLACE FUNCTION public.acct_find_period(p_company UUID, p_date DATE)
RETURNS public.acct_periods LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.acct_periods
   WHERE (company_id = p_company OR company_id IS NULL)
     AND p_date BETWEEN start_date AND end_date
   ORDER BY company_id NULLS LAST
   LIMIT 1
$$;

-- Block postings into closed periods + enforce balanced JE on post
CREATE OR REPLACE FUNCTION public.tg_je_enforce_period_and_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period public.acct_periods;
  v_debit NUMERIC;
  v_credit NUMERIC;
BEGIN
  -- Only enforce when transitioning to/keeping status='posted'
  IF NEW.status = 'posted' THEN
    -- Period check
    v_period := public.acct_find_period(NEW.company_id, NEW.posting_date);
    IF v_period.id IS NOT NULL AND v_period.status = 'closed' THEN
      RAISE EXCEPTION 'Cannot post into closed period % (% to %)',
        v_period.period_name, v_period.start_date, v_period.end_date
        USING ERRCODE = 'P0001';
    END IF;

    -- Balance check
    SELECT COALESCE(SUM(debit_amount),0), COALESCE(SUM(credit_amount),0)
      INTO v_debit, v_credit
      FROM public.finance_journal_entry_lines
     WHERE je_id = NEW.id;
    IF ABS(v_debit - v_credit) > 0.01 THEN
      RAISE EXCEPTION 'Journal entry not balanced: debit=% credit=% diff=%',
        v_debit, v_credit, (v_debit - v_credit)
        USING ERRCODE = 'P0001';
    END IF;

    -- Append to posting log when newly posted
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'posted') THEN
      INSERT INTO public.acct_posting_log
        (company_id, je_id, doc_number, action, posting_date, total_debit, total_credit, is_balanced, performed_by)
      VALUES
        (NEW.company_id, NEW.id, NEW.doc_number, 'post', NEW.posting_date, v_debit, v_credit, true, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_je_enforce ON public.finance_journal_entries;
CREATE TRIGGER tg_je_enforce
  BEFORE INSERT OR UPDATE ON public.finance_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_je_enforce_period_and_balance();

-- ============================================================
-- Intercompany auto-mirror
-- ============================================================
CREATE OR REPLACE FUNCTION public.acct_mirror_intercompany_je(
  p_origin_je_id UUID,
  p_partner_company_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_origin RECORD;
  v_mirror_id UUID;
  v_total NUMERIC;
  v_link_id UUID;
  v_line RECORD;
BEGIN
  SELECT * INTO v_origin FROM public.finance_journal_entries WHERE id = p_origin_je_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Origin JE not found'; END IF;

  -- Create mirror header
  INSERT INTO public.finance_journal_entries
    (company_id, posting_date, doc_date, due_date, reference,
     memo, status, doc_number, currency, total_debit, total_credit)
  SELECT p_partner_company_id, posting_date, doc_date, due_date,
         'IC-MIRROR:' || COALESCE(reference, doc_number),
         'Intercompany mirror of ' || COALESCE(doc_number, id::text) ||
         CASE WHEN p_notes IS NOT NULL THEN ' — ' || p_notes ELSE '' END,
         'draft', NULL, currency, total_credit, total_debit
    FROM public.finance_journal_entries WHERE id = p_origin_je_id
  RETURNING id INTO v_mirror_id;

  -- Mirror lines (swap debit/credit)
  FOR v_line IN
    SELECT * FROM public.finance_journal_entry_lines WHERE je_id = p_origin_je_id ORDER BY line_num
  LOOP
    INSERT INTO public.finance_journal_entry_lines
      (je_id, line_num, account_code, account_name,
       debit_amount, credit_amount, description, cost_center, project_code)
    VALUES
      (v_mirror_id, v_line.line_num, v_line.account_code, v_line.account_name,
       v_line.credit_amount, v_line.debit_amount,
       'Mirror: ' || COALESCE(v_line.description, ''),
       v_line.cost_center, v_line.project_code);
  END LOOP;

  SELECT COALESCE(SUM(debit_amount),0) INTO v_total
    FROM public.finance_journal_entry_lines WHERE je_id = p_origin_je_id;

  INSERT INTO public.acct_intercompany_links
    (origin_je_id, origin_company_id, mirror_je_id,
     mirror_company_id, total_amount, currency, link_type, notes, created_by)
  VALUES
    (p_origin_je_id, v_origin.company_id, v_mirror_id,
     p_partner_company_id, v_total, COALESCE(v_origin.currency,'SAR'),
     'auto_mirror', p_notes, auth.uid())
  RETURNING id INTO v_link_id;

  INSERT INTO public.acct_posting_log
    (company_id, je_id, action, performed_by, reason, metadata)
  VALUES
    (p_partner_company_id, v_mirror_id, 'intercompany_mirror', auth.uid(),
     'Auto-mirror from ' || v_origin.company_id::text,
     jsonb_build_object('origin_je_id', p_origin_je_id, 'link_id', v_link_id));

  RETURN v_mirror_id;
END $$;

-- ============================================================
-- Recurring JE generation function
-- ============================================================
CREATE OR REPLACE FUNCTION public.acct_run_recurring_je(p_template_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_t RECORD;
  v_je_id UUID;
  v_line RECORD;
  v_next DATE;
BEGIN
  SELECT * INTO v_t FROM public.acct_recurring_je_templates WHERE id = p_template_id FOR UPDATE;
  IF NOT FOUND OR NOT v_t.is_active THEN RETURN NULL; END IF;
  IF v_t.max_runs IS NOT NULL AND v_t.total_runs >= v_t.max_runs THEN RETURN NULL; END IF;

  INSERT INTO public.finance_journal_entries
    (company_id, posting_date, doc_date, reference, memo, status)
  VALUES
    (v_t.company_id, v_t.next_run_date, v_t.next_run_date,
     'REC:' || v_t.template_name,
     COALESCE(v_t.memo, 'Recurring entry: ' || v_t.template_name),
     CASE WHEN v_t.auto_post THEN 'posted' ELSE 'draft' END)
  RETURNING id INTO v_je_id;

  FOR v_line IN SELECT * FROM public.acct_recurring_je_lines WHERE template_id = p_template_id ORDER BY line_num LOOP
    INSERT INTO public.finance_journal_entry_lines
      (je_id, line_num, account_code, account_name,
       debit_amount, credit_amount, cost_center, project_code, description)
    VALUES
      (v_je_id, v_line.line_num, v_line.account_code, v_line.account_name,
       v_line.debit_amount, v_line.credit_amount,
       v_line.cost_center, v_line.project_code,
       COALESCE(v_line.description, v_t.template_name));
  END LOOP;

  -- Compute next run date
  v_next := CASE v_t.frequency
    WHEN 'monthly'    THEN v_t.next_run_date + INTERVAL '1 month'
    WHEN 'quarterly'  THEN v_t.next_run_date + INTERVAL '3 months'
    WHEN 'semi_annual' THEN v_t.next_run_date + INTERVAL '6 months'
    WHEN 'yearly'     THEN v_t.next_run_date + INTERVAL '1 year'
  END::DATE;

  UPDATE public.acct_recurring_je_templates
     SET last_run_date = v_t.next_run_date,
         last_run_je_id = v_je_id,
         next_run_date = v_next,
         total_runs = total_runs + 1
   WHERE id = p_template_id;

  INSERT INTO public.acct_posting_log
    (company_id, je_id, action, posting_date, performed_by, reason, metadata)
  VALUES
    (v_t.company_id, v_je_id, 'recurring_run', v_t.next_run_date, auth.uid(),
     'Generated from template: ' || v_t.template_name,
     jsonb_build_object('template_id', p_template_id, 'auto_post', v_t.auto_post));

  RETURN v_je_id;
END $$;

-- Run all due templates (called by cron)
CREATE OR REPLACE FUNCTION public.acct_run_due_recurring_jes()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_count INT := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.acct_recurring_je_templates
     WHERE is_active AND next_run_date <= CURRENT_DATE
       AND (end_date IS NULL OR next_run_date <= end_date)
  LOOP
    PERFORM public.acct_run_recurring_je(r.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;
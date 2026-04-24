-- QA Test Runs table
CREATE TABLE public.qa_test_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  tester_name TEXT,
  environment TEXT DEFAULT 'staging',
  tags TEXT[],
  notes TEXT,
  started_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view QA test runs"
  ON public.qa_test_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create QA test runs"
  ON public.qa_test_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update QA test runs"
  ON public.qa_test_runs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete QA test runs"
  ON public.qa_test_runs FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_qa_test_runs_updated_at
  BEFORE UPDATE ON public.qa_test_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- QA Test Records table (metadata-only references to records in other tables)
CREATE TABLE public.qa_test_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_run_id UUID NOT NULL REFERENCES public.qa_test_runs(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  module TEXT NOT NULL,
  label TEXT,
  doc_number TEXT,
  expected_result TEXT,
  actual_result TEXT,
  blocker_notes TEXT,
  evidence_status TEXT DEFAULT 'pending' CHECK (evidence_status IN ('pending', 'pass', 'fail', 'blocked', 'skipped')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_test_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view QA test records"
  ON public.qa_test_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create QA test records"
  ON public.qa_test_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update QA test records"
  ON public.qa_test_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete QA test records"
  ON public.qa_test_records FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_qa_test_records_updated_at
  BEFORE UPDATE ON public.qa_test_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_qa_test_records_run_id ON public.qa_test_records(test_run_id);
CREATE INDEX idx_qa_test_records_table_record ON public.qa_test_records(table_name, record_id);

-- ITSM Tables
CREATE TABLE public.it_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  requester_id UUID REFERENCES auth.users(id),
  requester_name TEXT,
  assigned_to_id UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  department TEXT,
  resolution TEXT,
  sla_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.it_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.it_tickets(id) ON DELETE CASCADE NOT NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.it_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  views INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.it_service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  estimated_time TEXT,
  requires_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.it_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users full access tickets" ON public.it_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access comments" ON public.it_ticket_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access kb" ON public.it_knowledge_base FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access catalog" ON public.it_service_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS it_ticket_seq START 1;

-- Add depreciation fields to assets if not present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'useful_life_years') THEN
    ALTER TABLE public.assets ADD COLUMN useful_life_years INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'salvage_value') THEN
    ALTER TABLE public.assets ADD COLUMN salvage_value NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'accumulated_depreciation') THEN
    ALTER TABLE public.assets ADD COLUMN accumulated_depreciation NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'net_book_value') THEN
    ALTER TABLE public.assets ADD COLUMN net_book_value NUMERIC;
  END IF;
END $$;

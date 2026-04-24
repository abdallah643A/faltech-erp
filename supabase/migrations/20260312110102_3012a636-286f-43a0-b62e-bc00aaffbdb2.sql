
-- Competitor tracking for opportunities
CREATE TABLE public.opportunity_competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  strengths TEXT,
  weaknesses TEXT,
  threat_level TEXT NOT NULL DEFAULT 'medium' CHECK (threat_level IN ('low', 'medium', 'high')),
  pricing_position TEXT CHECK (pricing_position IN ('lower', 'similar', 'higher', 'unknown')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunity_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage competitors"
  ON public.opportunity_competitors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Voice notes for activities
CREATE TABLE public.activity_voice_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  transcript TEXT,
  duration_seconds INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage voice notes"
  ON public.activity_voice_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

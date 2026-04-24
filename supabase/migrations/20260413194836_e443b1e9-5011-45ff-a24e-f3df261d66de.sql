
-- Help content for each ERP page
CREATE TABLE public.page_help_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL UNIQUE,
  page_route TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  description_en TEXT,
  description_ar TEXT,
  bullets_en TEXT[] DEFAULT '{}',
  bullets_ar TEXT[] DEFAULT '{}',
  video_url TEXT,
  video_duration_seconds INT,
  documentation_url TEXT,
  auto_popup_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.page_help_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view help content"
  ON public.page_help_content FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage help content"
  ON public.page_help_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User preferences per page
CREATE TABLE public.user_help_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page_key TEXT NOT NULL,
  dont_show_again BOOLEAN DEFAULT false,
  video_watched BOOLEAN DEFAULT false,
  watched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, page_key)
);

ALTER TABLE public.user_help_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own help preferences"
  ON public.user_help_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_page_help_content_updated_at
  BEFORE UPDATE ON public.page_help_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_help_preferences_updated_at
  BEFORE UPDATE ON public.user_help_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

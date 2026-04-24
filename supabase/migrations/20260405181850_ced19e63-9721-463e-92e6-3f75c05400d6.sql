
CREATE TABLE public.ui_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  translation_key TEXT NOT NULL,
  language_code TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  context TEXT,
  contributed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(translation_key, language_code)
);

ALTER TABLE public.ui_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view translations"
  ON public.ui_translations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert translations"
  ON public.ui_translations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = contributed_by);

CREATE POLICY "Users can update their own translations"
  ON public.ui_translations FOR UPDATE
  TO authenticated
  USING (auth.uid() = contributed_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete translations"
  ON public.ui_translations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ui_translations_key_lang ON public.ui_translations(translation_key, language_code);
CREATE INDEX idx_ui_translations_lang ON public.ui_translations(language_code);

CREATE TRIGGER update_ui_translations_updated_at
  BEFORE UPDATE ON public.ui_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

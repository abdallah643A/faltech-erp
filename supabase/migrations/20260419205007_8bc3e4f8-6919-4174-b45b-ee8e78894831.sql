-- ============================================================
-- PR2: Multi-tenant context & personalization foundation
-- ============================================================

-- 1) Per-user preferences (timezone, display currency, density, language override)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  display_currency TEXT,                -- ISO code; null = follow active company
  language TEXT,                        -- 'en' | 'ar' | 'ur' | 'hi'; null = follow company/browser
  density TEXT NOT NULL DEFAULT 'comfortable' CHECK (density IN ('compact','comfortable','spacious')),
  number_format TEXT NOT NULL DEFAULT 'en',
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own prefs" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_user_preferences()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_user_preferences ON public.user_preferences;
CREATE TRIGGER trg_touch_user_preferences
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_preferences();

-- 2) Admin-managed translation overrides (falls back to bundled keys in code)
CREATE TABLE IF NOT EXISTS public.app_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL DEFAULT 'app',
  key TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en','ar','ur','hi')),
  value TEXT NOT NULL,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (namespace, key, language)
);

CREATE INDEX IF NOT EXISTS idx_app_translations_lang ON public.app_translations(language);
CREATE INDEX IF NOT EXISTS idx_app_translations_key  ON public.app_translations(namespace, key);

ALTER TABLE public.app_translations ENABLE ROW LEVEL SECURITY;

-- All authenticated users may read translations; only admins may modify
-- (relies on existing has_role(_user_id, _role) function established in this project).
CREATE POLICY "Anyone authed can read translations" ON public.app_translations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage translations" ON public.app_translations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_app_translations()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_app_translations ON public.app_translations;
CREATE TRIGGER trg_touch_app_translations
  BEFORE UPDATE ON public.app_translations
  FOR EACH ROW EXECUTE FUNCTION public.touch_app_translations();
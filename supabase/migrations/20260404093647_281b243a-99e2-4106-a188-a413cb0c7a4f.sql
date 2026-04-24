
-- =============================================
-- 1. USER FAVORITES (pinned pages & quick actions)
-- =============================================
CREATE TABLE public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  favorite_type TEXT NOT NULL DEFAULT 'page',
  label TEXT NOT NULL,
  icon TEXT,
  href TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorites"
  ON public.user_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_favorites_user ON public.user_favorites(user_id);

-- =============================================
-- 2. SAVED VIEWS (filters, columns, sort, grouping)
-- =============================================
CREATE TABLE public.saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  view_name TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  columns JSONB DEFAULT '[]',
  sort_config JSONB DEFAULT '{}',
  grouping TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and shared views"
  ON public.saved_views FOR SELECT
  USING (auth.uid() = user_id OR is_shared = true);

CREATE POLICY "Users can create own views"
  ON public.saved_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own views"
  ON public.saved_views FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own views"
  ON public.saved_views FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_saved_views_user_module ON public.saved_views(user_id, module);

CREATE TRIGGER update_saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. DOCUMENT COMMENTS & MENTIONS
-- =============================================
CREATE TABLE public.document_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_email TEXT,
  document_type TEXT NOT NULL,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  parent_id UUID REFERENCES public.document_comments(id) ON DELETE CASCADE,
  attachments JSONB DEFAULT '[]',
  is_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view comments"
  ON public.document_comments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.document_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.document_comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.document_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_doc_comments_document ON public.document_comments(document_type, document_id);
CREATE INDEX idx_doc_comments_user ON public.document_comments(user_id);

CREATE TRIGGER update_doc_comments_updated_at
  BEFORE UPDATE ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. ADD severity and snoozed_until to workflow_notifications
-- =============================================
ALTER TABLE public.workflow_notifications
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_to UUID;

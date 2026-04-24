
-- Add lead scoring and segmentation columns to business_partners
ALTER TABLE public.business_partners
  ADD COLUMN IF NOT EXISTS score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS segment text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_insights jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_scored_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS risk_level text DEFAULT NULL;

-- Create customer_tags lookup table for predefined tags
CREATE TABLE IF NOT EXISTS public.customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT 'blue',
  category text DEFAULT 'general',
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid DEFAULT NULL
);

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tags" ON public.customer_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage tags" ON public.customer_tags
  FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Create smart segments table
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  conditions jsonb NOT NULL DEFAULT '{}',
  color text DEFAULT 'blue',
  is_smart boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid DEFAULT NULL
);

ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read segments" ON public.customer_segments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage segments" ON public.customer_segments
  FOR ALL TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role]));

-- Insert default tags
INSERT INTO public.customer_tags (name, color, category) VALUES
  ('VIP', 'gold', 'tier'),
  ('Enterprise', 'purple', 'tier'),
  ('SMB', 'blue', 'tier'),
  ('High Value', 'emerald', 'value'),
  ('At Risk', 'red', 'risk'),
  ('New Customer', 'green', 'lifecycle'),
  ('Returning', 'cyan', 'lifecycle'),
  ('Churned', 'gray', 'lifecycle'),
  ('Referral', 'orange', 'source'),
  ('Inbound', 'teal', 'source')
ON CONFLICT (name) DO NOTHING;

-- Insert default smart segments
INSERT INTO public.customer_segments (name, description, conditions, color) VALUES
  ('Hot Leads', 'Leads with score >= 80', '{"min_score": 80, "card_type": "lead"}', 'red'),
  ('Warm Leads', 'Leads with score 50-79', '{"min_score": 50, "max_score": 79, "card_type": "lead"}', 'amber'),
  ('Cold Leads', 'Leads with score < 50', '{"max_score": 49, "card_type": "lead"}', 'blue'),
  ('High Value Customers', 'Customers with credit limit > 100k', '{"min_credit_limit": 100000, "card_type": "customer"}', 'emerald'),
  ('At Risk', 'Partners flagged as at-risk', '{"risk_level": "high"}', 'red')
ON CONFLICT DO NOTHING;

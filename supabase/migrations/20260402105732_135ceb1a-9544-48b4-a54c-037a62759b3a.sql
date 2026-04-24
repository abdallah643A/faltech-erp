
-- Add SAP-related columns to branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS sap_synced_at TIMESTAMPTZ;

-- Add default_branch_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_branch_id UUID REFERENCES public.branches(id);

-- Create index on branches.code for quick lookups during sync
CREATE INDEX IF NOT EXISTS idx_branches_code ON public.branches(code);

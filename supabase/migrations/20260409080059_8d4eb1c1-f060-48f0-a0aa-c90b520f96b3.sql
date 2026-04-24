ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS require_dim1 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_dim2 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_dim3 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_dim4 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_dim5 boolean NOT NULL DEFAULT false;
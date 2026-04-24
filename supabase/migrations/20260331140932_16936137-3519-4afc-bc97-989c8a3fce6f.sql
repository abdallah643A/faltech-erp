
-- Add triangular trade fields to shipments
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS shipment_structure text NOT NULL DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS is_triangular boolean GENERATED ALWAYS AS (shipment_structure = 'triangular') STORED,
ADD COLUMN IF NOT EXISTS triangular_checklist jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.shipments.shipment_structure IS 'standard or triangular';

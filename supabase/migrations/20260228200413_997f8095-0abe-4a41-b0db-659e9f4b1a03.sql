-- Add default series column to profiles
ALTER TABLE public.profiles ADD COLUMN default_series_id uuid REFERENCES public.numbering_series(id) ON DELETE SET NULL;
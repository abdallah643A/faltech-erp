-- Add missing role values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'branch_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'painter';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technical_office';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'production';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'region_manager';
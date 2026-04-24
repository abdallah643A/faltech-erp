
-- Add enhanced columns to approval_stages
ALTER TABLE approval_stages
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS approval_logic text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS approval_percentage int,
  ADD COLUMN IF NOT EXISTS time_limit_hours int,
  ADD COLUMN IF NOT EXISTS escalation_user_id uuid,
  ADD COLUMN IF NOT EXISTS escalation_role text,
  ADD COLUMN IF NOT EXISTS rejection_action text DEFAULT 'return_creator',
  ADD COLUMN IF NOT EXISTS rejection_target_stage int,
  ADD COLUMN IF NOT EXISTS is_parallel boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS skip_conditions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{"email": true, "push": true, "reminder_hours": 24}'::jsonb,
  ADD COLUMN IF NOT EXISTS backup_approver_id uuid,
  ADD COLUMN IF NOT EXISTS backup_approver_role text,
  ADD COLUMN IF NOT EXISTS allow_delegation boolean DEFAULT true;

-- Add enhanced columns to approval_templates
ALTER TABLE approval_templates
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS sla_hours int,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS version int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS allow_edit_during_approval boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_comments boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS lock_after_approval boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS min_amount numeric,
  ADD COLUMN IF NOT EXISTS max_amount numeric,
  ADD COLUMN IF NOT EXISTS category text;

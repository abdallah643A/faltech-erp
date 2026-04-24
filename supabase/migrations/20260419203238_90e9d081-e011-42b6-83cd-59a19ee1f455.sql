-- ============================================================
-- Unified Mobile Offline Sync Framework (PR1)
-- Shared queue + last-write-wins audit, used by every module
-- (CPMS, WMS, POS, Banking, Field Ops). Existing module-
-- specific queues stay in place; this is the cross-cutting
-- governance layer that records every offline mutation, every
-- conflict, and the resolution outcome.
-- ============================================================

-- 1) Unified sync queue ---------------------------------------
CREATE TABLE IF NOT EXISTS public.mobile_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_op_id text NOT NULL,                 -- idempotency key from device
  company_id uuid,
  user_id uuid,
  device_id text,
  module text NOT NULL,                       -- 'wms' | 'cpms' | 'pos' | 'banking' | 'field_ops'
  entity text NOT NULL,                       -- e.g. 'pick_task', 'daily_report'
  entity_id uuid,                             -- target row, null for inserts
  operation text NOT NULL CHECK (operation IN ('insert','update','delete')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  base_version timestamptz,                   -- last known server updated_at (for LWW)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','syncing','applied','conflict','failed','superseded')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_op_id)
);

CREATE INDEX IF NOT EXISTS idx_msq_company_status
  ON public.mobile_sync_queue (company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msq_user_status
  ON public.mobile_sync_queue (user_id, status);
CREATE INDEX IF NOT EXISTS idx_msq_module_entity
  ON public.mobile_sync_queue (module, entity);

-- 2) Conflict audit -------------------------------------------
CREATE TABLE IF NOT EXISTS public.mobile_sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES public.mobile_sync_queue(id) ON DELETE CASCADE,
  company_id uuid,
  module text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  client_payload jsonb NOT NULL,
  server_snapshot jsonb,
  resolution text NOT NULL DEFAULT 'last_write_wins'
    CHECK (resolution IN ('last_write_wins','client_won','server_won','manual','superseded')),
  resolved_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msc_company_module
  ON public.mobile_sync_conflicts (company_id, module, created_at DESC);

-- 3) Device registry (lightweight) ----------------------------
CREATE TABLE IF NOT EXISTS public.mobile_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  user_id uuid,
  company_id uuid,
  label text,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  pending_ops int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobile_devices_user
  ON public.mobile_devices (user_id, last_seen_at DESC);

-- 4) updated_at trigger ---------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_msq_touch ON public.mobile_sync_queue;
CREATE TRIGGER trg_msq_touch BEFORE UPDATE ON public.mobile_sync_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) RLS -------------------------------------------------------
ALTER TABLE public.mobile_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_devices ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage only their own queue rows
CREATE POLICY "users see own sync queue"
  ON public.mobile_sync_queue FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users insert own sync queue"
  ON public.mobile_sync_queue FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users update own sync queue"
  ON public.mobile_sync_queue FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users see own conflicts"
  ON public.mobile_sync_conflicts FOR SELECT
  TO authenticated
  USING (
    queue_id IN (SELECT id FROM public.mobile_sync_queue WHERE user_id = auth.uid())
  );

CREATE POLICY "system inserts conflicts"
  ON public.mobile_sync_conflicts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "users see own devices"
  ON public.mobile_devices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users upsert own devices"
  ON public.mobile_devices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users update own devices"
  ON public.mobile_devices FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
create table if not exists public.executive_brief_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  company_id uuid not null references public.sap_companies(id) on delete cascade,
  email text not null,
  channel_email boolean not null default true,
  channel_inapp boolean not null default true,
  is_active boolean not null default true,
  last_emailed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index if not exists idx_exec_brief_subs_company
  on public.executive_brief_subscriptions (company_id, is_active);

alter table public.executive_brief_subscriptions enable row level security;

drop policy if exists "Users read own brief subscriptions" on public.executive_brief_subscriptions;
create policy "Users read own brief subscriptions"
  on public.executive_brief_subscriptions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own brief subscriptions" on public.executive_brief_subscriptions;
create policy "Users insert own brief subscriptions"
  on public.executive_brief_subscriptions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own brief subscriptions" on public.executive_brief_subscriptions;
create policy "Users update own brief subscriptions"
  on public.executive_brief_subscriptions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own brief subscriptions" on public.executive_brief_subscriptions;
create policy "Users delete own brief subscriptions"
  on public.executive_brief_subscriptions for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role manages brief subscriptions" on public.executive_brief_subscriptions;
create policy "Service role manages brief subscriptions"
  on public.executive_brief_subscriptions for all to service_role
  using (true) with check (true);

create or replace function public.touch_exec_brief_subs() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_touch_exec_brief_subs on public.executive_brief_subscriptions;
create trigger trg_touch_exec_brief_subs
  before update on public.executive_brief_subscriptions
  for each row execute function public.touch_exec_brief_subs();
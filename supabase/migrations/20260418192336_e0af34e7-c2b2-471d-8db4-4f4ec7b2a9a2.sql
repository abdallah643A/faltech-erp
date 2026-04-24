-- ============================================================
-- Executive Morning Brief — Snapshot Table
-- ============================================================
create table if not exists public.executive_brief_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sap_companies(id) on delete cascade,
  snapshot_date date not null default (now() at time zone 'Asia/Riyadh')::date,
  snapshot_at timestamptz not null default now(),

  -- Cash & AR
  ar_open_total numeric(18,2) not null default 0,
  ar_overdue_total numeric(18,2) not null default 0,
  ar_overdue_count integer not null default 0,
  ar_top_overdue_customer text,
  ar_top_overdue_amount numeric(18,2) not null default 0,

  -- AP
  ap_open_total numeric(18,2) not null default 0,
  ap_overdue_total numeric(18,2) not null default 0,
  ap_overdue_count integer not null default 0,

  -- Approvals
  approvals_pending_count integer not null default 0,
  approvals_oldest_hours numeric(10,2) not null default 0,

  -- Projects
  projects_at_risk_count integer not null default 0,
  projects_red_count integer not null default 0,
  projects_amber_count integer not null default 0,

  -- Sales
  sales_orders_today integer not null default 0,
  sales_revenue_today numeric(18,2) not null default 0,
  sales_revenue_mtd numeric(18,2) not null default 0,

  -- ZATCA
  zatca_failed_24h integer not null default 0,

  -- Meta
  status text not null default 'ok',
  error_message text,
  compute_ms integer,

  created_at timestamptz not null default now(),
  unique (company_id, snapshot_date)
);

create index if not exists idx_executive_brief_company_date
  on public.executive_brief_snapshots (company_id, snapshot_date desc);

alter table public.executive_brief_snapshots enable row level security;

-- Read: any authenticated user (tenant isolation enforced at app layer via active company)
drop policy if exists "Authenticated can read executive brief" on public.executive_brief_snapshots;
create policy "Authenticated can read executive brief"
  on public.executive_brief_snapshots
  for select
  to authenticated
  using (true);

-- Write: service role only (cron / edge functions). No user-facing INSERT/UPDATE.
drop policy if exists "Service role manages executive brief" on public.executive_brief_snapshots;
create policy "Service role manages executive brief"
  on public.executive_brief_snapshots
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- Aggregator function
-- ============================================================
create or replace function public.compute_executive_brief(p_company_id uuid)
returns public.executive_brief_snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz := clock_timestamp();
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_month_start date := date_trunc('month', v_today)::date;

  v_ar_open numeric(18,2);
  v_ar_overdue numeric(18,2);
  v_ar_overdue_count integer;
  v_top_customer text;
  v_top_amount numeric(18,2);

  v_ap_open numeric(18,2);
  v_ap_overdue numeric(18,2);
  v_ap_overdue_count integer;

  v_appr_pending integer;
  v_appr_oldest numeric(10,2);

  v_proj_at_risk integer;
  v_proj_red integer;
  v_proj_amber integer;

  v_sales_today_cnt integer;
  v_sales_today_amt numeric(18,2);
  v_sales_mtd numeric(18,2);

  v_zatca_failed integer;

  v_row public.executive_brief_snapshots;
begin
  -- AR open / overdue
  select
    coalesce(sum(coalesce(balance_due, 0)), 0),
    coalesce(sum(case when doc_due_date < v_today then coalesce(balance_due, 0) else 0 end), 0),
    coalesce(sum(case when doc_due_date < v_today and coalesce(balance_due,0) > 0 then 1 else 0 end), 0)
  into v_ar_open, v_ar_overdue, v_ar_overdue_count
  from public.ar_invoices
  where company_id = p_company_id
    and coalesce(balance_due, 0) > 0
    and coalesce(status, '') not in ('cancelled','closed','draft');

  -- Top overdue customer
  select customer_name, sum(coalesce(balance_due,0)) as amt
  into v_top_customer, v_top_amount
  from public.ar_invoices
  where company_id = p_company_id
    and coalesce(balance_due,0) > 0
    and doc_due_date < v_today
    and coalesce(status,'') not in ('cancelled','closed','draft')
  group by customer_name
  order by amt desc
  limit 1;

  -- AP open / overdue
  select
    coalesce(sum(coalesce(total, 0)), 0),
    coalesce(sum(case when doc_due_date < v_today then coalesce(total, 0) else 0 end), 0),
    coalesce(sum(case when doc_due_date < v_today then 1 else 0 end), 0)
  into v_ap_open, v_ap_overdue, v_ap_overdue_count
  from public.ap_invoices
  where company_id = p_company_id
    and coalesce(status, '') not in ('paid','cancelled','closed','draft');

  -- Approvals pending
  select
    count(*),
    coalesce(extract(epoch from (now() - min(created_at))) / 3600.0, 0)
  into v_appr_pending, v_appr_oldest
  from public.approval_requests
  where coalesce(status,'pending') in ('pending','in_review','waiting');

  -- Projects at risk
  select
    coalesce(sum(case when (end_date is not null and end_date < v_today and coalesce(status,'') not in ('completed','closed','cancelled'))
                    or coalesce(progress,0) < 50 and end_date is not null and end_date < v_today + interval '14 days'
                  then 1 else 0 end), 0),
    coalesce(sum(case when end_date is not null and end_date < v_today and coalesce(status,'') not in ('completed','closed','cancelled') then 1 else 0 end), 0),
    coalesce(sum(case when end_date is not null and end_date between v_today and v_today + interval '14 days' and coalesce(progress,0) < 50 then 1 else 0 end), 0)
  into v_proj_at_risk, v_proj_red, v_proj_amber
  from public.projects
  where company_id = p_company_id;

  -- Sales today / MTD (using sales_orders.doc_date when present)
  select
    coalesce(count(*) filter (where doc_date = v_today), 0)::int,
    coalesce(sum(case when doc_date = v_today then coalesce(total,0) else 0 end), 0),
    coalesce(sum(case when doc_date >= v_month_start then coalesce(total,0) else 0 end), 0)
  into v_sales_today_cnt, v_sales_today_amt, v_sales_mtd
  from public.sales_orders
  where company_id = p_company_id;

  -- ZATCA failed in last 24h
  begin
    execute $q$
      select count(*)::int from public.zatca_submissions
      where created_at >= now() - interval '24 hours'
        and lower(coalesce(status,'')) in ('failed','rejected','error')
    $q$ into v_zatca_failed;
  exception when others then
    v_zatca_failed := 0;
  end;

  -- Upsert snapshot
  insert into public.executive_brief_snapshots (
    company_id, snapshot_date, snapshot_at,
    ar_open_total, ar_overdue_total, ar_overdue_count,
    ar_top_overdue_customer, ar_top_overdue_amount,
    ap_open_total, ap_overdue_total, ap_overdue_count,
    approvals_pending_count, approvals_oldest_hours,
    projects_at_risk_count, projects_red_count, projects_amber_count,
    sales_orders_today, sales_revenue_today, sales_revenue_mtd,
    zatca_failed_24h,
    status, compute_ms
  ) values (
    p_company_id, v_today, now(),
    v_ar_open, v_ar_overdue, v_ar_overdue_count,
    v_top_customer, coalesce(v_top_amount,0),
    v_ap_open, v_ap_overdue, v_ap_overdue_count,
    coalesce(v_appr_pending,0), coalesce(v_appr_oldest,0),
    coalesce(v_proj_at_risk,0), coalesce(v_proj_red,0), coalesce(v_proj_amber,0),
    coalesce(v_sales_today_cnt,0), coalesce(v_sales_today_amt,0), coalesce(v_sales_mtd,0),
    coalesce(v_zatca_failed,0),
    'ok',
    extract(milliseconds from (clock_timestamp() - v_started_at))::int
  )
  on conflict (company_id, snapshot_date) do update
    set snapshot_at = excluded.snapshot_at,
        ar_open_total = excluded.ar_open_total,
        ar_overdue_total = excluded.ar_overdue_total,
        ar_overdue_count = excluded.ar_overdue_count,
        ar_top_overdue_customer = excluded.ar_top_overdue_customer,
        ar_top_overdue_amount = excluded.ar_top_overdue_amount,
        ap_open_total = excluded.ap_open_total,
        ap_overdue_total = excluded.ap_overdue_total,
        ap_overdue_count = excluded.ap_overdue_count,
        approvals_pending_count = excluded.approvals_pending_count,
        approvals_oldest_hours = excluded.approvals_oldest_hours,
        projects_at_risk_count = excluded.projects_at_risk_count,
        projects_red_count = excluded.projects_red_count,
        projects_amber_count = excluded.projects_amber_count,
        sales_orders_today = excluded.sales_orders_today,
        sales_revenue_today = excluded.sales_revenue_today,
        sales_revenue_mtd = excluded.sales_revenue_mtd,
        zatca_failed_24h = excluded.zatca_failed_24h,
        status = excluded.status,
        compute_ms = excluded.compute_ms
  returning * into v_row;

  return v_row;
exception when others then
  insert into public.executive_brief_snapshots (
    company_id, snapshot_date, status, error_message
  ) values (p_company_id, v_today, 'error', sqlerrm)
  on conflict (company_id, snapshot_date) do update
    set status = 'error', error_message = sqlerrm, snapshot_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

grant execute on function public.compute_executive_brief(uuid) to authenticated, service_role;
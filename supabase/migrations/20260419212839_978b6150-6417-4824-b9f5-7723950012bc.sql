alter table public.exec_board_packs add column if not exists payload jsonb;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'exec-morning-brief') then
      perform cron.unschedule('exec-morning-brief');
    end if;
    perform cron.schedule(
      'exec-morning-brief',
      '0 4 * * *',
      $cron$
      select net.http_post(
        url := 'https://wrjjzpgvnxapaonyjsbf.supabase.co/functions/v1/executive-brief-dispatch',
        headers := jsonb_build_object('Content-Type','application/json'),
        body := '{}'::jsonb
      );
      $cron$
    );
  end if;
end $$;
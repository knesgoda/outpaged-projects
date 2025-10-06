-- 03_github_webhooks.sql
create table if not exists public.github_webhook_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id text,
  event text,
  repo_full_name text,
  payload jsonb,
  received_at timestamptz not null default now()
);

alter table public.github_webhook_events enable row level security;

do
$$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'workspace_members'
  ) then
    execute $$
      create policy "github_webhook_read_admin" on public.github_webhook_events
      for select to authenticated
      using (
        exists(
          select 1 from public.workspace_members m
          where m.user_id = auth.uid() and m.role in ('owner','admin')
        )
      );
    $$;
  else
    raise notice 'TODO: create github_webhook_read_admin policy once workspace_members table is available';
  end if;
end;
$$;

create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  connection_id uuid references public.user_integrations(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sync_jobs enable row level security;

create policy "sync_jobs_owner_read" on public.sync_jobs
for select to authenticated
using (
  connection_id in (select id from public.user_integrations where user_id = auth.uid())
);

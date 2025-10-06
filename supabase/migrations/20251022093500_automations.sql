-- Automations and run history tables with RLS
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  action_type text not null,
  action_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.automations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'automations' and policyname = 'automations_owner_rw'
  ) then
    create policy "automations_owner_rw" on public.automations
    for all to authenticated
    using (owner = auth.uid())
    with check (owner = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'automations' and policyname = 'automations_project_read'
  ) then
    create policy "automations_project_read" on public.automations
    for select to authenticated
    using (
      project_id is not null and project_id in (
        select id from public.projects where owner = auth.uid()
        union
        select project_id from public.project_members where user_id = auth.uid()
      )
    );
  end if;
end;
$$;

create index if not exists automations_owner_idx on public.automations(owner);
create index if not exists automations_project_idx on public.automations(project_id);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  status text not null,
  message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.automation_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'automation_runs' and policyname = 'automation_runs_owner_read'
  ) then
    create policy "automation_runs_owner_read" on public.automation_runs
    for select to authenticated
    using (
      automation_id in (select id from public.automations where owner = auth.uid())
    );
  end if;
end;
$$;

create index if not exists automation_runs_automation_idx on public.automation_runs(automation_id);

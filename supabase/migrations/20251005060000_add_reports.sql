-- Reports table and policies
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy if not exists "reports_owner_rw" on public.reports
for all to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

create policy if not exists "reports_project_read" on public.reports
for select to authenticated
using (
  project_id is not null and project_id in (
    select id from public.projects where owner = auth.uid()
    union
    select project_id from public.project_members where user_id = auth.uid()
  )
);

create index if not exists reports_owner_idx on public.reports(owner);
create index if not exists reports_project_idx on public.reports(project_id);
create index if not exists reports_updated_at_idx on public.reports(updated_at);

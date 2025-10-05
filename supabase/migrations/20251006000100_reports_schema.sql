-- reports schema and policies
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "reports_owner_select" on public.reports;
create policy "reports_owner_select"
on public.reports for select
to authenticated
using (owner = auth.uid());

drop policy if exists "reports_owner_insert" on public.reports;
create policy "reports_owner_insert"
on public.reports for insert
to authenticated
with check (owner = auth.uid());

drop policy if exists "reports_owner_update" on public.reports;
create policy "reports_owner_update"
on public.reports for update
to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

drop policy if exists "reports_owner_delete" on public.reports;
create policy "reports_owner_delete"
on public.reports for delete
to authenticated
using (owner = auth.uid());

create index if not exists reports_owner_idx on public.reports(owner);
create index if not exists reports_updated_at_idx on public.reports(updated_at);


create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects_select"
  on public.projects for select to authenticated
  using (owner = auth.uid());

create policy "projects_owner_cud"
  on public.projects for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

create index if not exists projects_owner_idx on public.projects(owner);

-- 0X_integrations.sql
create table if not exists public.integrations (
  key text primary key,
  name text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb
);
alter table public.integrations enable row level security;

create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null,
  display_name text,
  access_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, provider, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid))
);
alter table public.user_integrations enable row level security;

create policy "integrations_read_all" on public.integrations
for select to authenticated using (true);

create policy "user_integrations_self_rw" on public.user_integrations
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  target_url text not null,
  secret text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.webhooks enable row level security;

create policy "webhooks_owner_rw" on public.webhooks
for all to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

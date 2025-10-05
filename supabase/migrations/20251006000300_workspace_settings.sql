-- workspace settings table and policies
create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  brand_name text,
  brand_logo_url text,
  updated_at timestamptz not null default now()
);

create unique index if not exists workspace_settings_owner_key
  on public.workspace_settings(owner);

alter table public.workspace_settings enable row level security;

drop policy if exists "ws_read_owner" on public.workspace_settings;
create policy "ws_read_owner"
on public.workspace_settings for select
to authenticated
using (owner = auth.uid());

drop policy if exists "ws_upsert_owner" on public.workspace_settings;
create policy "ws_upsert_owner"
on public.workspace_settings for insert
to authenticated
with check (owner = auth.uid());

drop policy if exists "ws_update_owner" on public.workspace_settings;
create policy "ws_update_owner"
on public.workspace_settings for update
to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());


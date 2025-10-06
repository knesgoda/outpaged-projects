-- Workspace settings and membership
create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text,
  brand_logo_url text,
  default_timezone text,
  default_capacity_hours_per_week numeric default 40,
  allowed_email_domain text,
  features jsonb not null default '{}'::jsonb,
  security jsonb not null default '{}'::jsonb,
  billing jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member'
);

alter table public.workspace_settings enable row level security;
alter table public.workspace_members enable row level security;

create policy "workspace_read_members" on public.workspace_settings
for select to authenticated using (
  exists (
    select 1
    from public.workspace_members m
    where m.user_id = auth.uid()
  )
);

create policy "workspace_write_admin" on public.workspace_settings
for all to authenticated using (
  exists (
    select 1
    from public.workspace_members m
    where m.user_id = auth.uid() and m.role in ('owner','admin')
  )
) with check (
  exists (
    select 1
    from public.workspace_members m
    where m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

create policy "members_read_all" on public.workspace_members
for select to authenticated using (true);

create policy "members_manage_admin" on public.workspace_members
for all to authenticated using (
  exists (
    select 1
    from public.workspace_members m
    where m.user_id = auth.uid() and m.role in ('owner','admin')
  )
) with check (
  exists (
    select 1
    from public.workspace_members m
    where m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

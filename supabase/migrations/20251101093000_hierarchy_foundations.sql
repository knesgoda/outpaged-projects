-- Phase 0 hierarchy foundations: organizations and workspace scoping
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.workspaces
  add column if not exists organization_id uuid;

alter table public.workspaces
  add column if not exists icon text;

alter table public.workspaces
  add column if not exists color text;

alter table public.workspaces
  add column if not exists archived_at timestamptz;

alter table public.workspaces
  add column if not exists position integer;

alter table public.workspaces
  add constraint workspaces_organization_id_fkey
  foreign key (organization_id) references public.organizations(id)
  on delete set null;

create index if not exists idx_workspaces_organization on public.workspaces(organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspaces enable row level security;

create policy if not exists "organization members read organizations"
  on public.organizations
  for select
  using (
    exists (
      select 1 from public.organization_members mem
      where mem.organization_id = organizations.id
        and mem.user_id = auth.uid()
    )
  );

create policy if not exists "organization admins manage organizations"
  on public.organizations
  for all
  using (
    exists (
      select 1 from public.organization_members mem
      where mem.organization_id = organizations.id
        and mem.user_id = auth.uid()
        and mem.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.organization_members mem
      where mem.organization_id = organizations.id
        and mem.user_id = auth.uid()
        and mem.role in ('owner', 'admin')
    )
  );

create policy if not exists "members manage their membership"
  on public.organization_members
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "members view organization workspaces"
  on public.workspaces
  for select
  using (
    organization_id is null or exists (
      select 1 from public.organization_members mem
      where mem.organization_id = workspaces.organization_id
        and mem.user_id = auth.uid()
    )
  );

create policy if not exists "admins manage organization workspaces"
  on public.workspaces
  for all
  using (
    organization_id is null or exists (
      select 1 from public.organization_members mem
      where mem.organization_id = workspaces.organization_id
        and mem.user_id = auth.uid()
        and mem.role in ('owner', 'admin')
    )
  )
  with check (
    organization_id is null or exists (
      select 1 from public.organization_members mem
      where mem.organization_id = workspaces.organization_id
        and mem.user_id = auth.uid()
        and mem.role in ('owner', 'admin')
    )
  );

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_touch_updated
  before update on public.organizations
  for each row
  execute procedure public.touch_updated_at();

create trigger organization_members_touch_updated
  before update on public.organization_members
  for each row
  execute procedure public.touch_updated_at();

create trigger workspaces_touch_updated
  before update on public.workspaces
  for each row
  execute procedure public.touch_updated_at();

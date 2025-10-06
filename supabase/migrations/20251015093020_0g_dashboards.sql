create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  project_id uuid references public.projects(id) on delete cascade,
  layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboards enable row level security;

create policy "dashboards_owner_rw"
on public.dashboards for all to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

create index if not exists dashboards_owner_idx on public.dashboards(owner);
create index if not exists dashboards_project_idx on public.dashboards(project_id);

create table if not exists public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  type text not null,
  title text,
  config jsonb not null default '{}'::jsonb,
  position jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_widgets enable row level security;

create policy "widgets_rw_owner"
on public.dashboard_widgets for all to authenticated
using (
  dashboard_id in (select id from public.dashboards where owner = auth.uid())
)
with check (
  dashboard_id in (select id from public.dashboards where owner = auth.uid())
);

create index if not exists widgets_dashboard_idx on public.dashboard_widgets(dashboard_id);
create index if not exists widgets_type_idx on public.dashboard_widgets(type);

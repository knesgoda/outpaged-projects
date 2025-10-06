create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  parent_goal_id uuid references public.goals(id) on delete set null,
  cycle_id uuid references public.okr_cycles(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'on_track',
  weight numeric not null default 1,
  progress numeric not null default 0,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.key_results (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  title text not null,
  metric_start numeric,
  metric_target numeric,
  metric_current numeric,
  unit text,
  weight numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_updates (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  status text not null,
  note text,
  progress numeric,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;
alter table public.key_results enable row level security;
alter table public.goal_updates enable row level security;

create policy if not exists "goals_owner_rw" on public.goals for all to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

create policy if not exists "goals_project_read" on public.goals for select to authenticated
using (
  project_id is null
  or project_id in (
    select id from public.projects where owner = auth.uid()
    union
    select project_id from public.project_members where user_id = auth.uid()
  )
);

create policy if not exists "krs_owner_rw" on public.key_results for all to authenticated
using (goal_id in (select id from public.goals where owner = auth.uid()))
with check (goal_id in (select id from public.goals where owner = auth.uid()));

create policy if not exists "krs_project_read" on public.key_results for select to authenticated
using (goal_id in (
  select id from public.goals
  where project_id is null
     or project_id in (
       select id from public.projects where owner = auth.uid()
       union
       select project_id from public.project_members where user_id = auth.uid()
     )
));

create policy if not exists "goal_updates_owner_rw" on public.goal_updates for all to authenticated
using (goal_id in (select id from public.goals where owner = auth.uid()))
with check (goal_id in (select id from public.goals where owner = auth.uid()));

create index if not exists goals_owner_idx on public.goals(owner);
create index if not exists goals_project_idx on public.goals(project_id);
create index if not exists goals_cycle_idx on public.goals(cycle_id);
create index if not exists goals_parent_idx on public.goals(parent_goal_id);
create index if not exists krs_goal_idx on public.key_results(goal_id);
create index if not exists goal_updates_goal_idx on public.goal_updates(goal_id);

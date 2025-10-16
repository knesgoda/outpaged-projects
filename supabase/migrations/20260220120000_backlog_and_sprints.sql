-- Backlog and sprint tables
create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  goal text,
  status text not null default 'planning',
  start_date date,
  end_date date,
  capacity integer,
  velocity_history jsonb default '[]'::jsonb,
  member_capacity jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sprints enable row level security;

create policy if not exists "sprints_read_all"
  on public.sprints for select
  using (true);

create policy if not exists "sprints_write_all"
  on public.sprints for all
  using (true)
  with check (true);

create table if not exists public.backlog_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'new',
  priority text not null default 'medium',
  story_points integer,
  time_estimate_hours integer,
  acceptance_criteria text[] default array[]::text[],
  business_value integer not null default 0,
  effort integer not null default 0,
  sprint_id uuid references public.sprints(id) on delete set null,
  rank numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.backlog_items enable row level security;

create policy if not exists "backlog_items_read_all"
  on public.backlog_items for select
  using (true);

create policy if not exists "backlog_items_write_all"
  on public.backlog_items for all
  using (true)
  with check (true);

create index if not exists backlog_items_rank_idx on public.backlog_items(rank asc nulls last, created_at asc);
create index if not exists backlog_items_status_idx on public.backlog_items(status);
create index if not exists backlog_items_sprint_idx on public.backlog_items(sprint_id);

create table if not exists public.backlog_history (
  id uuid primary key default gen_random_uuid(),
  backlog_item_id uuid not null references public.backlog_items(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  event_type text not null,
  detail text
);

alter table public.backlog_history enable row level security;

create policy if not exists "backlog_history_read_all"
  on public.backlog_history for select
  using (true);

create policy if not exists "backlog_history_write_all"
  on public.backlog_history for all
  using (true)
  with check (true);

create index if not exists backlog_history_item_idx on public.backlog_history(backlog_item_id, occurred_at desc);

create table if not exists public.backlog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

alter table public.backlog_tags enable row level security;

create policy if not exists "backlog_tags_read_all"
  on public.backlog_tags for select
  using (true);

create policy if not exists "backlog_tags_write_all"
  on public.backlog_tags for all
  using (true)
  with check (true);

create unique index if not exists backlog_tags_name_unique on public.backlog_tags(name);

create table if not exists public.backlog_item_tags (
  backlog_item_id uuid not null references public.backlog_items(id) on delete cascade,
  tag_id uuid not null references public.backlog_tags(id) on delete cascade,
  primary key (backlog_item_id, tag_id)
);

alter table public.backlog_item_tags enable row level security;

create policy if not exists "backlog_item_tags_read_all"
  on public.backlog_item_tags for select
  using (true);

create policy if not exists "backlog_item_tags_write_all"
  on public.backlog_item_tags for all
  using (true)
  with check (true);

create table if not exists public.backlog_item_assignees (
  id uuid primary key default gen_random_uuid(),
  backlog_item_id uuid not null references public.backlog_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

alter table public.backlog_item_assignees enable row level security;

create policy if not exists "backlog_item_assignees_read_all"
  on public.backlog_item_assignees for select
  using (true);

create policy if not exists "backlog_item_assignees_write_all"
  on public.backlog_item_assignees for all
  using (true)
  with check (true);

create unique index if not exists backlog_item_assignees_unique on public.backlog_item_assignees(backlog_item_id, user_id);

create table if not exists public.sprint_items (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.sprints(id) on delete cascade,
  backlog_item_id uuid not null references public.backlog_items(id) on delete cascade,
  position integer not null default 0,
  committed_points integer,
  added_at timestamptz not null default now(),
  unique (sprint_id, backlog_item_id)
);

alter table public.sprint_items enable row level security;

create policy if not exists "sprint_items_read_all"
  on public.sprint_items for select
  using (true);

create policy if not exists "sprint_items_write_all"
  on public.sprint_items for all
  using (true)
  with check (true);

create index if not exists sprint_items_position_idx on public.sprint_items(sprint_id, position);

-- Seed initial backlog data for regression tests
with seed_tags as (
  insert into public.backlog_tags (id, name, color)
  values
    ('00000000-0000-4000-a000-000000000001', 'Platform', '#4f46e5'),
    ('00000000-0000-4000-a000-000000000002', 'Customer', '#0ea5e9'),
    ('00000000-0000-4000-a000-000000000003', 'Growth', '#22c55e')
  on conflict (name) do update set color = excluded.color
  returning id, name
)
select 1;

insert into public.sprints (id, name, goal, status, start_date, end_date, capacity, velocity_history, member_capacity)
values
  ('00000000-0000-4000-a000-000000000010', 'Sprint Alpha', 'Stabilize onboarding flow', 'active', '2024-04-01', '2024-04-14', 45, '[30, 34, 36]'::jsonb, '{"Alice Johnson": 15, "Bob Smith": 15, "Carol Perez": 15}'::jsonb),
  ('00000000-0000-4000-a000-000000000011', 'Sprint Beta', 'Experiment with growth loops', 'planning', '2024-04-15', '2024-04-28', 48, '[32, 35, 38]'::jsonb, '{"Alice Johnson": 16, "Bob Smith": 16, "Dana Lee": 16}'::jsonb)
on conflict (id) do update set
  goal = excluded.goal,
  status = excluded.status,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  capacity = excluded.capacity,
  velocity_history = excluded.velocity_history,
  member_capacity = excluded.member_capacity;

insert into public.backlog_items (
  id,
  title,
  description,
  status,
  priority,
  story_points,
  time_estimate_hours,
  acceptance_criteria,
  business_value,
  effort,
  sprint_id,
  rank
)
values
  (
    '00000000-0000-4000-a000-000000000101',
    'Revamp onboarding checklist',
    'Create contextual guidance for new teams onboarding to the platform.',
    'ready',
    'high',
    8,
    16,
    array['Checklist covers setup', 'Guidance adapts by role'],
    9,
    5,
    '00000000-0000-4000-a000-000000000010',
    1
  ),
  (
    '00000000-0000-4000-a000-000000000102',
    'Instrument workspace health metrics',
    'Capture activation and retention metrics for workspaces to track health.',
    'estimated',
    'medium',
    5,
    12,
    array['Metrics refresh daily', 'Dashboard for CS team'],
    8,
    4,
    null,
    2
  ),
  (
    '00000000-0000-4000-a000-000000000103',
    'Improve billing proration',
    'Ensure plan upgrades prorate correctly with add-on bundles.',
    'refined',
    'urgent',
    13,
    24,
    array['Supports mid-cycle upgrades', 'Finance reporting reconciles'],
    10,
    7,
    '00000000-0000-4000-a000-000000000010',
    3
  ),
  (
    '00000000-0000-4000-a000-000000000104',
    'Launch in-product feedback collector',
    'Collect NPS and qualitative feedback directly within app workflows.',
    'new',
    'medium',
    3,
    6,
    array['Feedback stored in CRM', 'Supports targeted campaigns'],
    7,
    3,
    null,
    4
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  priority = excluded.priority,
  story_points = excluded.story_points,
  time_estimate_hours = excluded.time_estimate_hours,
  acceptance_criteria = excluded.acceptance_criteria,
  business_value = excluded.business_value,
  effort = excluded.effort,
  sprint_id = excluded.sprint_id,
  rank = excluded.rank,
  updated_at = now();

insert into public.backlog_item_tags (backlog_item_id, tag_id)
values
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-a000-000000000102', '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-a000-000000000103', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-a000-000000000103', '00000000-0000-4000-a000-000000000003'),
  ('00000000-0000-4000-a000-000000000104', '00000000-0000-4000-a000-000000000003')
on conflict do nothing;

insert into public.sprint_items (id, sprint_id, backlog_item_id, position, committed_points)
values
  ('00000000-0000-4000-a000-000000000201', '00000000-0000-4000-a000-000000000010', '00000000-0000-4000-a000-000000000101', 1, 8),
  ('00000000-0000-4000-a000-000000000202', '00000000-0000-4000-a000-000000000010', '00000000-0000-4000-a000-000000000103', 2, 13)
on conflict (sprint_id, backlog_item_id) do update set
  position = excluded.position,
  committed_points = excluded.committed_points;

insert into public.backlog_history (id, backlog_item_id, occurred_at, event_type, detail)
values
  ('00000000-0000-4000-a000-000000000301', '00000000-0000-4000-a000-000000000101', now() - interval '7 days', 'status_change', 'Moved to ready'),
  ('00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000101', now() - interval '2 days', 'moved_to_sprint', 'Committed to Sprint Alpha'),
  ('00000000-0000-4000-a000-000000000303', '00000000-0000-4000-a000-000000000102', now() - interval '3 days', 'estimate_update', 'Updated estimate to 12 hours'),
  ('00000000-0000-4000-a000-000000000304', '00000000-0000-4000-a000-000000000103', now() - interval '1 day', 'rank_change', 'Rank adjusted to 3')
on conflict (id) do update set
  occurred_at = excluded.occurred_at,
  event_type = excluded.event_type,
  detail = excluded.detail;

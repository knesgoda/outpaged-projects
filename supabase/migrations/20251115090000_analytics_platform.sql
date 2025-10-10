-- analytics platform schema
set check_function_bodies = off;

create schema if not exists analytics;

create table if not exists analytics.dim_items (
  item_id uuid primary key default gen_random_uuid(),
  source_id uuid,
  source_table text not null,
  item_type text not null,
  name text not null,
  slug text,
  description text,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique(source_id, source_table)
);

create table if not exists analytics.dim_users (
  user_id uuid primary key,
  full_name text,
  email text,
  locale text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analytics.dim_projects (
  project_id uuid primary key,
  workspace_id uuid,
  name text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analytics.dim_dates (
  date_key date primary key,
  year smallint not null,
  quarter smallint not null,
  month smallint not null,
  week smallint not null,
  day smallint not null,
  iso_week smallint not null,
  iso_year smallint not null,
  month_name text not null,
  day_name text not null,
  is_weekend boolean not null default false
);

create table if not exists analytics.fact_events (
  event_id bigint generated always as identity primary key,
  event_key text not null,
  occurred_at timestamptz not null,
  item_id uuid references analytics.dim_items(item_id),
  actor_id uuid references analytics.dim_users(user_id),
  project_id uuid references analytics.dim_projects(project_id),
  date_key date references analytics.dim_dates(date_key),
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fact_events_occurred_idx
  on analytics.fact_events (occurred_at desc);

create table if not exists analytics.fact_rollups (
  rollup_id bigint generated always as identity primary key,
  item_id uuid references analytics.dim_items(item_id),
  metric text not null,
  period text not null,
  date_key date references analytics.dim_dates(date_key),
  value numeric not null,
  created_at timestamptz not null default now(),
  unique(item_id, metric, period, date_key)
);

create table if not exists analytics.dim_cohorts (
  cohort_id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  definition jsonb not null,
  owner_id uuid references analytics.dim_users(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analytics.fact_cohort_memberships (
  cohort_id uuid references analytics.dim_cohorts(cohort_id) on delete cascade,
  member_id uuid not null,
  joined_at timestamptz not null,
  left_at timestamptz,
  primary key (cohort_id, member_id, joined_at)
);

create table if not exists analytics.governance_metadata (
  entity_id uuid primary key,
  entity_type text not null,
  lineage jsonb default '[]'::jsonb,
  tags text[] default array[]::text[],
  sensitivity text,
  retention_policy text,
  last_reviewed_at timestamptz,
  steward_id uuid references analytics.dim_users(user_id)
);

create materialized view if not exists analytics.mv_event_daily as
select
  e.date_key,
  e.project_id,
  e.item_id,
  count(*) as events,
  count(distinct e.actor_id) as unique_actors
from analytics.fact_events e
where e.date_key is not null
group by e.date_key, e.project_id, e.item_id;

create index if not exists mv_event_daily_date_idx on analytics.mv_event_daily(date_key desc);

create or replace function analytics.ensure_date_dim(start_date date, end_date date)
returns void
language plpgsql
as $$
declare
  d date;
begin
  d := start_date;
  while d <= end_date loop
    insert into analytics.dim_dates (date_key, year, quarter, month, week, day, iso_week, iso_year, month_name, day_name, is_weekend)
    values (
      d,
      extract(year from d)::smallint,
      extract(quarter from d)::smallint,
      extract(month from d)::smallint,
      extract(week from d)::smallint,
      extract(day from d)::smallint,
      extract(isodow from d)::smallint,
      extract(isoyear from d)::smallint,
      to_char(d, 'Month'),
      to_char(d, 'Day'),
      extract(isodow from d) in (6, 7)
    )
    on conflict (date_key) do update set
      year = excluded.year,
      quarter = excluded.quarter,
      month = excluded.month,
      week = excluded.week,
      day = excluded.day,
      iso_week = excluded.iso_week,
      iso_year = excluded.iso_year,
      month_name = excluded.month_name,
      day_name = excluded.day_name,
      is_weekend = excluded.is_weekend;

    d := d + interval '1 day';
  end loop;
end;
$$;

create or replace function analytics.refresh_rollups()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view analytics.mv_event_daily;
end;
$$;

comment on schema analytics is 'Dimensional analytics model for reports and governance.';
comment on function analytics.refresh_rollups is 'Refresh daily aggregates to support time intelligence.';

create or replace function public.analytics_refresh_rollups(
  p_start_date date default null,
  p_end_date date default null
)
returns void
language plpgsql
security definer
set search_path = public, analytics
as $$
declare
  v_start date := coalesce(p_start_date, current_date - interval '365 days');
  v_end date := coalesce(p_end_date, current_date + interval '30 days');
begin
  perform analytics.ensure_date_dim(v_start, v_end);
  perform analytics.refresh_rollups();
end;
$$;

grant usage on schema analytics to authenticated;
grant select on all tables in schema analytics to authenticated;
grant select on all sequences in schema analytics to authenticated;

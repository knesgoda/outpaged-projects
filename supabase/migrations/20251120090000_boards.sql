-- Boards schema for container/query/hybrid experiences
create type board_type as enum ('container', 'query', 'hybrid');

create table boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  type board_type not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table boards
  add constraint boards_id_type_unique unique (id, type);

create table board_scopes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  scope_type board_type not null,
  container_id uuid,
  query_definition text,
  filters jsonb default '{}'::jsonb not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint board_scopes_board_type_match
    check (
      (scope_type = 'container' and container_id is not null and query_definition is null)
      or (scope_type = 'query' and query_definition is not null)
      or (scope_type = 'hybrid' and container_id is not null and query_definition is not null)
    )
);

create table board_filter_expressions (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  expression_type board_type not null,
  expression jsonb not null,
  refresh_interval_seconds integer,
  last_evaluated_at timestamptz,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table board_views (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  filter_expression_id uuid references board_filter_expressions(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  is_default boolean not null default false,
  position integer not null default 0,
  configuration jsonb default '{}'::jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint board_views_slug_unique unique (board_id, slug)
);

create index board_views_board_id_idx on board_views(board_id);
create index board_filter_expressions_board_id_idx on board_filter_expressions(board_id);
create index board_scopes_board_id_idx on board_scopes(board_id);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger update_boards_updated_at
before update on boards
for each row
execute function public.update_updated_at_column();

create trigger update_board_scopes_updated_at
before update on board_scopes
for each row
execute function public.update_updated_at_column();

create trigger update_board_filter_expressions_updated_at
before update on board_filter_expressions
for each row
execute function public.update_updated_at_column();

create trigger update_board_views_updated_at
before update on board_views
for each row
execute function public.update_updated_at_column();

alter table board_scopes
  add constraint board_scopes_scope_type_matches_board
  foreign key (board_id, scope_type)
  references boards(id, type)
  on delete cascade;

create or replace view boards_with_default_view as
select
  b.*, 
  bv.id as default_view_id
from boards b
left join board_views bv
  on bv.board_id = b.id
 and bv.is_default = true;

-- Board templates and blueprint schema
create type board_template_visibility as enum ('public', 'workspace', 'private');

create table board_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  type board_type not null,
  visibility board_template_visibility not null default 'workspace',
  preview_asset_url text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  scope_definition jsonb not null default '{}'::jsonb,
  supports_items boolean not null default false,
  supports_automations boolean not null default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, slug)
);

create table board_template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references board_templates(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type text not null,
  configuration jsonb not null default '{}'::jsonb,
  is_required boolean not null default false,
  is_primary boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (template_id, field_key)
);

create table board_template_views (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references board_templates(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  is_default boolean not null default false,
  position integer not null default 0,
  configuration jsonb not null default '{}'::jsonb,
  filter_definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (template_id, slug)
);

create table board_template_view_color_rules (
  id uuid primary key default gen_random_uuid(),
  template_view_id uuid not null references board_template_views(id) on delete cascade,
  label text not null,
  rule_type text not null,
  color text not null,
  field text,
  value jsonb,
  description text,
  expression text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table board_template_automations (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references board_templates(id) on delete cascade,
  recipe_slug text not null,
  name text not null,
  description text,
  trigger_config jsonb not null default '{}'::jsonb,
  action_config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table board_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references board_templates(id) on delete cascade,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index board_template_fields_template_id_idx on board_template_fields(template_id);
create index board_template_views_template_id_idx on board_template_views(template_id);
create index board_template_view_color_rules_view_id_idx on board_template_view_color_rules(template_view_id);
create index board_template_automations_template_id_idx on board_template_automations(template_id);
create index board_template_items_template_id_idx on board_template_items(template_id);

create trigger update_board_templates_updated_at
before update on board_templates
for each row execute function public.update_updated_at_column();

create trigger update_board_template_fields_updated_at
before update on board_template_fields
for each row execute function public.update_updated_at_column();

create trigger update_board_template_views_updated_at
before update on board_template_views
for each row execute function public.update_updated_at_column();

create trigger update_board_template_view_color_rules_updated_at
before update on board_template_view_color_rules
for each row execute function public.update_updated_at_column();

create trigger update_board_template_automations_updated_at
before update on board_template_automations
for each row execute function public.update_updated_at_column();

create trigger update_board_template_items_updated_at
before update on board_template_items
for each row execute function public.update_updated_at_column();

create or replace function seed_board_template_items(
  template_id uuid,
  board_id uuid,
  item_ids uuid[] default null
) returns void language plpgsql as $$
begin
  -- Placeholder implementation for local development; real implementation handled downstream.
  perform 1;
end;
$$;

create or replace function seed_board_template_automations(
  template_id uuid,
  board_id uuid,
  recipe_slugs text[] default null
) returns void language plpgsql as $$
begin
  -- Placeholder implementation for local development; real implementation handled downstream.
  perform 1;
end;
$$;

create or replace function copy_board_items(
  source_board_id uuid,
  target_board_id uuid,
  item_ids uuid[] default null
) returns void language plpgsql as $$
begin
  -- Placeholder implementation for local development; real implementation handled downstream.
  perform 1;
end;
$$;

create or replace function copy_board_automations(
  source_board_id uuid,
  target_board_id uuid,
  recipe_slugs text[] default null
) returns void language plpgsql as $$
begin
  -- Placeholder implementation for local development; real implementation handled downstream.
  perform 1;
end;
$$;

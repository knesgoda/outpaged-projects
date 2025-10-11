-- Automation engine schema
create table if not exists automation_recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  trigger_type text not null,
  trigger_schema jsonb not null default '{}'::jsonb,
  action_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists project_automations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  recipe_slug text not null references automation_recipes(slug) on delete cascade,
  enabled boolean not null default true,
  trigger_config jsonb not null default '{}'::jsonb,
  action_config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, recipe_slug)
);

create table if not exists automation_event_queue (
  id bigserial primary key,
  project_id uuid not null references projects(id) on delete cascade,
  recipe_slug text references automation_recipes(slug) on delete set null,
  event_type text not null,
  task_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create or replace function set_project_automations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_project_automations_updated_at on project_automations;
create trigger trg_project_automations_updated_at
before update on project_automations
for each row execute function set_project_automations_updated_at();

create table if not exists public.project_templates (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  category text,
  manifest jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_templates enable row level security;

create policy if not exists "templates_owner_rw" on public.project_templates
for all to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

create policy if not exists "templates_public_read" on public.project_templates
for select to authenticated using (is_public = true or owner = auth.uid());

create index if not exists templates_owner_idx on public.project_templates(owner);
create index if not exists templates_public_idx on public.project_templates(is_public);
create index if not exists templates_category_idx on public.project_templates(category);

with first_user as (
  select id from auth.users limit 1
)
insert into public.project_templates (owner, name, description, category, manifest, is_public)
select
  first_user.id,
  tmpl.name,
  tmpl.description,
  tmpl.category,
  tmpl.manifest::jsonb,
  true
from first_user,
  (values
    ('Product Launch Plan', 'Track GTM tasks from kickoff to launch', 'product', '{"columns":["Backlog","In Progress","Launch"],"tasks":[{"title":"Define launch goals","column":"Backlog"},{"title":"Draft messaging","column":"In Progress"}]}'),
    ('Marketing Campaign', 'Coordinate multi-channel marketing campaigns', 'marketing', '{"columns":["Ideas","Producing","Scheduled","Live"],"tasks":[{"title":"Audience research","column":"Ideas"},{"title":"Design creatives","column":"Producing"}]}'),
    ('Customer Onboarding', 'Guide new customers through activation', 'success', '{"columns":["Signed","Kickoff","Adoption","Live"],"tasks":[{"title":"Schedule kickoff","column":"Kickoff"},{"title":"Configure workspace","column":"Adoption"}]}')
  ) as tmpl(name, description, category, manifest)
where not exists (
  select 1 from public.project_templates
);

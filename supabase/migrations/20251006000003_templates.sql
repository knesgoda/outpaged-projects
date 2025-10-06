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

create policy "templates_owner_rw" on public.project_templates
for all to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

create policy "templates_public_read" on public.project_templates
for select to authenticated using (is_public = true or owner = auth.uid());

create index if not exists templates_owner_idx on public.project_templates(owner);
create index if not exists templates_public_idx on public.project_templates(is_public);
create index if not exists templates_category_idx on public.project_templates(category);

with first_user as (
  select id from auth.users order by created_at limit 1
)
insert into public.project_templates (owner, name, description, category, manifest, is_public)
select
  first_user.id,
  seed.name,
  seed.description,
  seed.category,
  seed.manifest,
  seed.is_public
from first_user,
  (values
    (
      'Product Sprint Starter',
      'Plan sprints with backlog, progress columns, and starter tasks.',
      'product',
      jsonb_build_object(
        'columns', jsonb_build_array('Backlog', 'Sprint', 'Review', 'Done'),
        'tasks', jsonb_build_array(
          jsonb_build_object('title', 'Sprint kickoff', 'column', 'Sprint'),
          jsonb_build_object('title', 'Backlog grooming', 'column', 'Backlog')
        )
      ),
      true
    ),
    (
      'Marketing Launch Plan',
      'Coordinate launch activities with ready-made workflow.',
      'marketing',
      jsonb_build_object(
        'columns', jsonb_build_array('Ideas', 'In Progress', 'Review', 'Launched'),
        'tasks', jsonb_build_array(
          jsonb_build_object('title', 'Messaging draft', 'column', 'In Progress'),
          jsonb_build_object('title', 'Launch checklist', 'column', 'Review')
        )
      ),
      true
    ),
    (
      'Customer Onboarding',
      'Guide new customers from kickoff to value realization.',
      'success',
      jsonb_build_object(
        'columns', jsonb_build_array('New', 'In Progress', 'Adopted'),
        'tasks', jsonb_build_array(
          jsonb_build_object('title', 'Welcome call', 'column', 'New'),
          jsonb_build_object('title', 'Value review', 'column', 'Adopted')
        )
      ),
      true
    )
  ) as seed(name, description, category, manifest, is_public)
where not exists (select 1 from public.project_templates);

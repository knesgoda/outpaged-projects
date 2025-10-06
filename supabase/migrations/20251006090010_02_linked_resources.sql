-- 02_linked_resources.sql
create table if not exists public.linked_resources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_type text not null,
  external_id text,
  url text,
  title text,
  metadata jsonb not null default '{}'::jsonb,
  entity_type text not null,
  entity_id uuid not null,
  project_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.linked_resources enable row level security;

create policy "linked_resources_read_members" on public.linked_resources
for select to authenticated
using (
  case entity_type
    when 'project' then entity_id in (
      select id from public.projects where owner_id = auth.uid()
      union
      select project_id from public.project_members where user_id = auth.uid()
    )
    when 'task' then exists (
      select 1 from public.tasks t
      where t.id = linked_resources.entity_id
        and t.project_id in (
          select id from public.projects where owner_id = auth.uid()
          union
          select project_id from public.project_members where user_id = auth.uid()
        )
    )
    when 'doc' then true
    else false
  end
);

create policy "linked_resources_write_members" on public.linked_resources
for all to authenticated
using (
  created_by = auth.uid()
  or (
    project_id in (
      select id from public.projects where owner_id = auth.uid()
      union
      select project_id from public.project_members where user_id = auth.uid() and role in ('admin','project_manager')
    )
  )
)
with check (
  created_by = auth.uid()
  or (
    project_id in (
      select id from public.projects where owner_id = auth.uid()
      union
      select project_id from public.project_members where user_id = auth.uid() and role in ('admin','project_manager')
    )
  )
);

create index if not exists linked_resources_entity_idx on public.linked_resources(entity_type, entity_id);
create index if not exists linked_resources_provider_idx on public.linked_resources(provider, external_type);

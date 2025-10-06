-- Expand reports with project scoping and refreshed policies
alter table public.reports
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

-- ensure config column exists with default jsonb
alter table public.reports
  alter column config set data type jsonb using config::jsonb,
  alter column config set default '{}'::jsonb,
  alter column config set not null;

-- refresh policies to support project based reads
drop policy if exists "reports_owner_select" on public.reports;
drop policy if exists "reports_owner_insert" on public.reports;
drop policy if exists "reports_owner_update" on public.reports;
drop policy if exists "reports_owner_delete" on public.reports;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reports' and policyname = 'reports_owner_rw'
  ) then
    create policy "reports_owner_rw" on public.reports
    for all to authenticated
    using (owner = auth.uid())
    with check (owner = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reports' and policyname = 'reports_project_read'
  ) then
    create policy "reports_project_read" on public.reports
    for select to authenticated
    using (
      project_id is not null and project_id in (
        select id from public.projects where owner = auth.uid()
        union
        select project_id from public.project_members where user_id = auth.uid()
      )
    );
  end if;
end;
$$;

create index if not exists reports_project_idx on public.reports(project_id);
create index if not exists reports_owner_idx on public.reports(owner);
create index if not exists reports_updated_at_idx on public.reports(updated_at);

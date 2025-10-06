-- Files bucket and project file mapping
select storage.create_bucket('files', public => false);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  bucket text not null default 'files',
  path text not null,
  size_bytes bigint not null default 0,
  mime_type text,
  title text,
  uploaded_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.project_files enable row level security;

create policy if not exists "project_files_rw_members" on public.project_files
for all to authenticated
using (
  project_id in (
    select id from public.projects where owner = auth.uid()
    union
    select project_id from public.project_members where user_id = auth.uid()
  )
)
with check (
  project_id in (
    select id from public.projects where owner = auth.uid()
    union
    select project_id from public.project_members where user_id = auth.uid()
  )
);

create index if not exists project_files_project_idx on public.project_files(project_id);
create index if not exists project_files_path_idx on public.project_files(path);

create policy if not exists "files_select_members" on storage.objects
for select to authenticated
using (
  bucket_id = 'files'
  and exists (
    select 1 from public.project_files pf
    where pf.bucket = 'files' and pf.path = storage.objects.name
      and pf.project_id in (
        select id from public.projects where owner = auth.uid()
        union
        select project_id from public.project_members where user_id = auth.uid()
      )
  )
);

create policy if not exists "files_insert_members" on storage.objects
for insert to authenticated
with check (bucket_id = 'files');

create policy if not exists "files_update_members" on storage.objects
for update to authenticated
using (bucket_id = 'files');

create policy if not exists "files_delete_members" on storage.objects
for delete to authenticated
using (
  bucket_id = 'files'
  and exists (
    select 1 from public.project_files pf
    where pf.bucket = 'files' and pf.path = storage.objects.name
      and pf.project_id in (
        select id from public.projects where owner = auth.uid()
        union
        select project_id from public.project_members where user_id = auth.uid()
      )
  )
);

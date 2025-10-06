-- Update comments table to support entity scoping and rich bodies
alter table public.comments
  rename column content to body_markdown;

alter table public.comments
  rename column author_id to author;

alter table public.comments
  drop constraint if exists fk_comments_author_id;

alter table public.comments
  add constraint comments_author_fkey foreign key (author) references auth.users(id) on delete cascade;

alter table public.comments
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists parent_id uuid references public.comments(id) on delete cascade,
  add column if not exists body_html text,
  add column if not exists edited_at timestamptz;

alter table public.comments
  alter column body_markdown set default '';

update public.comments
set body_markdown = coalesce(body_markdown, '');

update public.comments
set entity_type = 'task',
    entity_id = task_id
where entity_type is null;

alter table public.comments
  alter column entity_type set not null,
  alter column entity_id set not null,
  alter column body_markdown set not null;

alter table public.comments
  add constraint comments_entity_type_check
    check (entity_type in ('task', 'project', 'doc'));

alter table public.comments
  drop constraint if exists comments_task_id_fkey;

alter table public.comments
  drop column if exists task_id;

create index if not exists comments_entity_idx on public.comments(entity_type, entity_id);
create index if not exists comments_parent_idx on public.comments(parent_id);

-- Refresh RLS policies for new structure
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'comments'
      and policyname in (
        'Users can view comments in their projects',
        'Project members can view comments',
        'Users can create comments on their project tasks',
        'Users can update their own comments',
        'Users can delete their own comments',
        'Admins can manage all comments'
      )
  ) then
    drop policy if exists "Users can view comments in their projects" on public.comments;
    drop policy if exists "Project members can view comments" on public.comments;
    drop policy if exists "Users can create comments on their project tasks" on public.comments;
    drop policy if exists "Users can update their own comments" on public.comments;
    drop policy if exists "Users can delete their own comments" on public.comments;
    drop policy if exists "Admins can manage all comments" on public.comments;
  end if;
end $$;

create policy comments_read on public.comments
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
      where t.id = public.comments.entity_id
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

create policy comments_insert on public.comments
for insert to authenticated
with check (author = auth.uid());

create policy comments_update on public.comments
for update to authenticated
using (author = auth.uid())
with check (author = auth.uid());

create policy comments_delete on public.comments
for delete to authenticated
using (author = auth.uid());


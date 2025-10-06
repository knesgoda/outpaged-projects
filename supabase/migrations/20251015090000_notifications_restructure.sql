-- Align notifications table with new entity metadata and lifecycle columns
alter table public.notifications
  drop constraint if exists fk_notifications_task,
  drop constraint if exists fk_notifications_project,
  drop constraint if exists notifications_type_check;

-- migrate legacy message schema to the new shape
alter table public.notifications
  rename column message to body;

alter table public.notifications
  alter column body drop not null,
  alter column title drop not null;

-- add lifecycle + entity metadata columns when missing
alter table public.notifications
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists project_id uuid,
  add column if not exists link text,
  add column if not exists read_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.notifications
set entity_id = coalesce(entity_id, related_task_id::uuid),
    entity_type = coalesce(entity_type, case when related_task_id is not null then 'task' end)
where related_task_id is not null;

update public.notifications
set project_id = coalesce(project_id, related_project_id)
where related_project_id is not null;

update public.notifications
set read_at = coalesce(read_at, created_at)
where read = true and read_at is null;

alter table public.notifications
  drop column if exists read,
  drop column if exists related_task_id,
  drop column if exists related_project_id;

-- ensure title/body accept nulls
alter table public.notifications
  alter column body type text,
  alter column title type text;

-- backfill legacy type values before tightening constraint
update public.notifications
set type = 'automation'
where type not in (
  'mention',
  'assigned',
  'comment_reply',
  'status_change',
  'due_soon',
  'automation',
  'file_shared',
  'doc_comment'
);

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'mention',
      'assigned',
      'comment_reply',
      'status_change',
      'due_soon',
      'automation',
      'file_shared',
      'doc_comment'
    )
  );

-- enforce ownership relationship
alter table public.notifications
  drop constraint if exists notifications_user_id_fkey,
  add constraint notifications_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.notifications
  drop constraint if exists notifications_project_id_fkey,
  add constraint notifications_project_id_fkey
    foreign key (project_id) references public.projects(id) on delete set null;

-- (re)enable compact RLS policy
alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can insert their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "notifications_self_rw" on public.notifications;

create policy "notifications_self_rw" on public.notifications
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- refresh indexes for the new columns
drop index if exists notifications_user_id_created_at_idx;
drop index if exists notifications_user_id_read_idx;

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_read_idx
  on public.notifications(user_id, read_at);

create index if not exists notifications_project_idx
  on public.notifications(project_id);

alter table public.notifications
  rename column message to body;

alter table public.notifications
  alter column title drop not null;

alter table public.notifications
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists read_at timestamptz;

alter table public.notifications
  drop column if exists related_task_id;

alter table public.notifications
  drop column if exists related_project_id;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
    check (type in ('info','success','warning','error','mention'));

update public.notifications
set read_at = coalesce(read_at, case when read then updated_at else null end);

alter table public.notifications
  drop column if exists read;

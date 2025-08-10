
-- 1) Create notifications table with safe RLS and indexes
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null,
  type text not null check (type in ('info','success','warning','error')),
  read boolean not null default false,
  related_task_id uuid null,
  related_project_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_notifications_task
    foreign key (related_task_id) references public.tasks(id) on delete set null,
  constraint fk_notifications_project
    foreign key (related_project_id) references public.projects(id) on delete set null
);

alter table public.notifications enable row level security;

-- RLS: users read their own notifications
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='Users can view their own notifications') then
    create policy "Users can view their own notifications"
      on public.notifications for select
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='Users can insert their own notifications') then
    create policy "Users can insert their own notifications"
      on public.notifications for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='Users can update their own notifications') then
    create policy "Users can update their own notifications"
      on public.notifications for update
      using (auth.uid() = user_id);
  end if;
end $$;

-- indexes for fast inbox queries
create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_read_idx
  on public.notifications (user_id, read);

-- updated_at trigger on update
do $$
begin
  if not exists (select 1 from pg_trigger where tgname='notifications_set_updated_at') then
    create trigger notifications_set_updated_at
    before update on public.notifications
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- 2) Create a robust view for project members with profile info
create or replace view public.project_members_with_profiles as
select
  pm.project_id,
  pm.user_id,
  p.full_name,
  p.avatar_url
from public.project_members pm
join public.profiles p
  on p.user_id = pm.user_id;

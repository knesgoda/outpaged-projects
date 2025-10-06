create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  minutes int not null check (minutes >= 0),
  entry_date date not null default (now()::date),
  note text,
  created_at timestamptz not null default now()
);

alter table public.time_entries enable row level security;

create policy "time_entries_rw" on public.time_entries
for all to authenticated
using (
  user_id = auth.uid() or
  task_id in (
    select t.id from public.tasks t
    where t.project_id in (
      select p.id from public.projects p
      where p.owner = auth.uid()
      union
      select pm.project_id from public.project_members pm where pm.user_id = auth.uid()
    )
  )
)
with check (
  user_id = auth.uid()
);

create index if not exists time_entries_task_idx on public.time_entries(task_id);
create index if not exists time_entries_user_idx on public.time_entries(user_id);
create index if not exists time_entries_date_idx on public.time_entries(entry_date);

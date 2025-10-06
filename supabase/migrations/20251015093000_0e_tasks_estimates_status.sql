alter table public.tasks
  add column if not exists estimate_minutes int,
  add column if not exists status text default 'todo';

create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);

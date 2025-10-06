create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'open',
  priority text default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

drop policy if exists "tickets_self_rw" on public.support_tickets;
create policy "tickets_self_rw" on public.support_tickets
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tickets_admin_read" on public.support_tickets;
create policy "tickets_admin_read" on public.support_tickets
for select to authenticated
using (
  exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.title in ('admin', 'owner', 'manager')
  )
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  page_path text,
  message text not null,
  screenshot_url text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback_self_write_read" on public.feedback;
create policy "feedback_self_write_read" on public.feedback
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "feedback_admin_read" on public.feedback;
create policy "feedback_admin_read" on public.feedback
for select to authenticated
using (
  exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.title in ('admin', 'owner', 'manager')
  )
);

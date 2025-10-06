create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  version text,
  body_markdown text not null,
  body_html text,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.announcements enable row level security;

drop policy if exists "announcements_read_all" on public.announcements;
create policy "announcements_read_all" on public.announcements
for select to authenticated
using (true);

drop policy if exists "announcements_write_admin" on public.announcements;
create policy "announcements_write_admin" on public.announcements
for all to authenticated
using (
  exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.title in ('admin', 'owner', 'manager')
  )
)
with check (
  exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.title in ('admin', 'owner', 'manager')
  )
);

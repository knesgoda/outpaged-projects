-- profiles table and policies
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_self_upsert" on public.profiles;
create policy "profiles_self_upsert"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());


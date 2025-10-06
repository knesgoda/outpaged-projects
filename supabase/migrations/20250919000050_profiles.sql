-- User profile data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  title text,
  department text,
  timezone text,
  capacity_hours_per_week numeric,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_read_all" on public.profiles
for select to authenticated using (true);

create policy "profiles_self_insert" on public.profiles
for insert to authenticated with check (id = auth.uid());

create policy "profiles_self_update" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

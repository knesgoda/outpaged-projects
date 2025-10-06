create table if not exists public.okr_cycles (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now()
);

alter table public.okr_cycles enable row level security;

create policy "cycles_owner_rw" on public.okr_cycles
for all to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

create index if not exists okr_cycles_owner_idx on public.okr_cycles(owner);
create index if not exists okr_cycles_dates_idx on public.okr_cycles(starts_on, ends_on);

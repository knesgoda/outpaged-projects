-- Outbound webhook registry
create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  target_url text not null,
  secret text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.webhooks enable row level security;

create policy "webhooks_owner_rw" on public.webhooks
for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

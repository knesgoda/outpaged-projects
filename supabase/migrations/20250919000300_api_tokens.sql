-- API token storage
create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  token_prefix text not null,
  token_hash text not null,
  last_four text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.api_tokens enable row level security;

create policy "tokens_self_rw" on public.api_tokens
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists api_tokens_user_idx on public.api_tokens(user_id);

create table if not exists public.comment_mentions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  mentioned_user uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(comment_id, mentioned_user)
);

alter table public.comment_mentions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'comment_mentions'
      and policyname = 'mentions_read'
  ) then
    create policy mentions_read on public.comment_mentions
    for select to authenticated
    using (
      exists(
        select 1 from public.comments c
        where c.id = comment_id
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'comment_mentions'
      and policyname = 'mentions_insert_auth'
  ) then
    create policy mentions_insert_auth on public.comment_mentions
    for insert to authenticated
    with check (
      exists(
        select 1 from public.comments c
        where c.id = comment_id
        and c.author = auth.uid()
      )
    );
  end if;
end $$;

create index if not exists comment_mentions_user_idx on public.comment_mentions(mentioned_user);

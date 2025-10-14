alter table public.comments
  add column if not exists body_json jsonb,
  add column if not exists metadata jsonb,
  add column if not exists edited_by uuid references auth.users(id);

create table if not exists public.comment_backlinks (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  target_type text not null check (target_type in ('task','project','doc','file','comment')),
  target_id uuid not null,
  context jsonb,
  created_at timestamptz not null default now()
);

create index if not exists comment_backlinks_target_idx on public.comment_backlinks(target_type, target_id);

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique(comment_id, user_id, emoji)
);

create table if not exists public.comment_history (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  version serial,
  body_markdown text not null,
  body_html text,
  body_json jsonb,
  edited_by uuid references auth.users(id),
  edited_at timestamptz not null default now()
);

alter table public.comment_history enable row level security;
alter table public.comment_backlinks enable row level security;
alter table public.comment_reactions enable row level security;

create policy comment_history_read on public.comment_history
  for select to authenticated using (true);

create policy comment_backlinks_read on public.comment_backlinks
  for select to authenticated using (true);

create policy comment_reactions_read on public.comment_reactions
  for select to authenticated using (true);

create policy comment_reactions_manage on public.comment_reactions
  for insert with check (user_id = auth.uid());

create policy comment_reactions_delete on public.comment_reactions
  for delete using (user_id = auth.uid());

create policy comment_backlinks_write on public.comment_backlinks
  for insert with check (true);

create policy comment_backlinks_delete on public.comment_backlinks
  for delete using (exists(select 1 from public.comments c where c.id = comment_id and c.author = auth.uid()));

create policy comment_history_insert on public.comment_history
  for insert with check (true);

create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text unique,
  category text,
  tags text[] default '{}',
  body_markdown text not null default '',
  body_html text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.help_articles enable row level security;

drop policy if exists "help_articles_owner_rw" on public.help_articles;
create policy "help_articles_owner_rw" on public.help_articles
for all to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

drop policy if exists "help_articles_published_read" on public.help_articles;
create policy "help_articles_published_read" on public.help_articles
for select to authenticated
using (is_published = true);

alter table public.help_articles add column if not exists search tsvector;

create index if not exists help_articles_search_idx on public.help_articles using gin(search);

create or replace function public.help_articles_tsv_update() returns trigger language plpgsql as $$
begin
  new.search := setweight(to_tsvector('simple', coalesce(new.title, '')), 'A')
              || setweight(to_tsvector('simple', coalesce(new.body_markdown, '')), 'B');
  return new;
end$$;

drop trigger if exists trg_help_articles_tsv on public.help_articles;
create trigger trg_help_articles_tsv
before insert or update on public.help_articles
for each row execute function public.help_articles_tsv_update();

-- Docs & Wiki tables and search helpers
create table if not exists public.doc_pages (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  parent_id uuid references public.doc_pages(id) on delete cascade,
  title text not null,
  slug text,
  body_markdown text not null default '',
  body_html text,
  is_published boolean not null default true,
  version int not null default 1,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.doc_pages enable row level security;

create table if not exists public.doc_versions (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.doc_pages(id) on delete cascade,
  version int not null,
  title text not null,
  body_markdown text not null,
  body_html text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (doc_id, version)
);

alter table public.doc_versions enable row level security;

alter table public.doc_pages add column if not exists search tsvector;
create index if not exists doc_pages_search_idx on public.doc_pages using gin(search);

create or replace function public.doc_pages_tsv_update() returns trigger language plpgsql as $$
begin
  new.search :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.body_markdown,'')), 'B');
  return new;
end$$;

drop trigger if exists trg_doc_pages_tsv on public.doc_pages;
create trigger trg_doc_pages_tsv before insert or update on public.doc_pages
for each row execute function public.doc_pages_tsv_update();

create policy if not exists "docs_owner_rw" on public.doc_pages
for all to authenticated
using (owner = auth.uid())
with check (owner = auth.uid());

create policy if not exists "docs_project_read" on public.doc_pages
for select to authenticated
using (
  project_id is null
  or project_id in (
    select id from public.projects where owner = auth.uid()
    union
    select project_id from public.project_members where user_id = auth.uid()
  )
);

create policy if not exists "doc_versions_owner_rw" on public.doc_versions
for all to authenticated
using (
  doc_id in (select id from public.doc_pages where owner = auth.uid())
)
with check (
  doc_id in (select id from public.doc_pages where owner = auth.uid())
);

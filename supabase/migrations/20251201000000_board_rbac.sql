-- Board governance and role-based access control
create type board_role as enum ('owner', 'manager', 'editor', 'commenter', 'viewer', 'guest');

create table board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role board_role not null default 'viewer',
  invited_by uuid references profiles(id),
  invitation_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint board_members_unique unique (board_id, user_id)
);

create table board_share_links (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  slug text not null unique,
  created_by uuid not null references profiles(id) on delete cascade,
  password_hash text,
  expires_at timestamptz,
  max_uses integer,
  usage_count integer not null default 0,
  allowed_role board_role not null default 'guest',
  created_at timestamptz not null default timezone('utc', now()),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint board_share_links_expiration_check
    check (expires_at is null or expires_at > timezone('utc', now()))
);

create table board_field_visibility (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  field_key text not null,
  hidden_for_roles board_role[] not null default array[]::board_role[],
  is_sensitive boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint board_field_visibility_unique unique (board_id, field_key)
);

create table board_item_privacy (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  item_id uuid not null,
  visibility board_role not null default 'commenter',
  reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint board_item_privacy_unique unique (board_id, item_id)
);

create table board_governance_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  default_template_ids uuid[] not null default array[]::uuid[],
  allowed_field_types text[] not null default array[]::text[],
  naming_rules jsonb not null default '{}'::jsonb,
  taxonomy jsonb not null default '{}'::jsonb,
  lifecycle_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint board_governance_settings_workspace_unique unique (workspace_id)
);

create or replace function board_role_rank(role board_role)
returns integer
language sql
as $$
  select case role
    when 'owner' then 6
    when 'manager' then 5
    when 'editor' then 4
    when 'commenter' then 3
    when 'viewer' then 2
    when 'guest' then 1
  end;
$$;

create or replace function board_role_at_least(target board_role, required board_role)
returns boolean
language sql
immutable
as $$
  select board_role_rank(target) >= board_role_rank(required);
$$;

create or replace function current_board_role(board uuid)
returns board_role
language sql
stable
as $$
  select bm.role
  from board_members bm
  where bm.board_id = board
    and bm.user_id = auth.uid()
  limit 1;
$$;

create or replace function has_board_role(board uuid, required board_role)
returns boolean
language sql
stable
as $$
  select case
    when auth.role() = 'service_role' then true
    when auth.uid() is null then false
    else coalesce(board_role_at_least(current_board_role(board), required), false)
  end;
$$;

create trigger update_board_members_updated_at
before update on board_members
for each row
execute function public.update_updated_at_column();

create trigger update_board_field_visibility_updated_at
before update on board_field_visibility
for each row
execute function public.update_updated_at_column();

create trigger update_board_item_privacy_updated_at
before update on board_item_privacy
for each row
execute function public.update_updated_at_column();

create trigger update_board_governance_settings_updated_at
before update on board_governance_settings
for each row
execute function public.update_updated_at_column();

alter table board_members enable row level security;
alter table board_share_links enable row level security;
alter table board_field_visibility enable row level security;
alter table board_item_privacy enable row level security;
alter table board_governance_settings enable row level security;

create policy "Members can view membership" on board_members
for select using (has_board_role(board_id, 'guest'));

create policy "Managers can manage membership" on board_members
for all using (has_board_role(board_id, 'manager')) with check (has_board_role(board_id, 'manager'));

create policy "Members can view share links" on board_share_links
for select using (has_board_role(board_id, 'viewer'));

create policy "Managers can manage share links" on board_share_links
for all using (has_board_role(board_id, 'manager')) with check (has_board_role(board_id, 'manager'));

create policy "Members can view field visibility" on board_field_visibility
for select using (has_board_role(board_id, 'viewer'));

create policy "Managers can manage field visibility" on board_field_visibility
for all using (has_board_role(board_id, 'manager')) with check (has_board_role(board_id, 'manager'));

create policy "Members can view item privacy" on board_item_privacy
for select using (has_board_role(board_id, 'commenter'));

create policy "Managers can manage item privacy" on board_item_privacy
for all using (has_board_role(board_id, 'manager')) with check (has_board_role(board_id, 'manager'));

create policy "Admins can access board governance" on board_governance_settings
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create view board_members_with_profiles as
select
  bm.board_id,
  bm.user_id,
  bm.role,
  bm.created_at,
  bm.updated_at,
  p.full_name,
  p.avatar_url,
  p.title,
  p.department
from board_members bm
join profiles p on p.id = bm.user_id;

alter view board_members_with_profiles owner to postgres;

grant select on board_members_with_profiles to authenticated;
grant select on board_members_with_profiles to service_role;

create or replace function record_board_audit()
returns trigger
language plpgsql
as $$
begin
  insert into audit_logs (action, actor_id, resource, details)
  values (
    tg_table_name || ':' || tg_op,
    auth.uid(),
    coalesce(new.board_id, old.board_id)::text,
    jsonb_build_object(
      'table', tg_table_name,
      'id', coalesce(new.id, old.id),
      'new', to_jsonb(new),
      'old', to_jsonb(old)
    )
  );
  return coalesce(new, old);
end;
$$;

create trigger board_members_audit
after insert or update or delete on board_members
for each row execute function record_board_audit();

create trigger board_share_links_audit
after insert or update or delete on board_share_links
for each row execute function record_board_audit();

create trigger board_field_visibility_audit
after insert or update or delete on board_field_visibility
for each row execute function record_board_audit();

create trigger board_item_privacy_audit
after insert or update or delete on board_item_privacy
for each row execute function record_board_audit();

-- Create unified notification preferences table with JSON channels
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app jsonb not null default '{
    "mention": true,
    "assigned": true,
    "comment_reply": true,
    "status_change": true,
    "due_soon": true,
    "automation": true,
    "file_shared": true,
    "doc_comment": true
  }'::jsonb,
  email jsonb not null default '{
    "mention": false,
    "assigned": false,
    "comment_reply": false,
    "status_change": false,
    "due_soon": true,
    "automation": false,
    "file_shared": false,
    "doc_comment": false
  }'::jsonb,
  digest_frequency text not null default 'daily',
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences
  drop constraint if exists notification_preferences_digest_check,
  add constraint notification_preferences_digest_check
    check (digest_frequency in ('off', 'daily', 'weekly'));

alter table public.notification_preferences enable row level security;

drop policy if exists "prefs_self_rw" on public.notification_preferences;
create policy "prefs_self_rw" on public.notification_preferences
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- migrate legacy preferences when present
DO $$
BEGIN
  IF to_regclass('public.user_notification_preferences') IS NOT NULL THEN
    INSERT INTO public.notification_preferences (user_id, in_app, email, digest_frequency, updated_at)
    SELECT
      user_id,
      jsonb_build_object(
        'mention', coalesce(in_app_mentions, true),
        'assigned', coalesce(in_app_task_updates, true),
        'comment_reply', coalesce(in_app_project_updates, true),
        'status_change', true,
        'due_soon', true,
        'automation', true,
        'file_shared', true,
        'doc_comment', true
      ),
      jsonb_build_object(
        'mention', coalesce(email_mentions, false),
        'assigned', coalesce(email_task_updates, false),
        'comment_reply', coalesce(email_project_updates, false),
        'status_change', false,
        'due_soon', true,
        'automation', false,
        'file_shared', false,
        'doc_comment', false
      ),
      'daily',
      updated_at
    FROM public.user_notification_preferences
    ON CONFLICT (user_id) DO UPDATE
      SET in_app = excluded.in_app,
          email = excluded.email,
          updated_at = now();
  END IF;
END $$;

-- Create subscriptions table for follow/following features
create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

alter table public.notification_subscriptions
  drop constraint if exists notification_subscriptions_entity_type_check,
  add constraint notification_subscriptions_entity_type_check
    check (entity_type in ('task', 'project', 'doc'));

alter table public.notification_subscriptions enable row level security;

drop policy if exists "subs_self_rw" on public.notification_subscriptions;
create policy "subs_self_rw" on public.notification_subscriptions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create index if not exists subs_entity_idx
  on public.notification_subscriptions(entity_type, entity_id);

create index if not exists subs_user_idx
  on public.notification_subscriptions(user_id);

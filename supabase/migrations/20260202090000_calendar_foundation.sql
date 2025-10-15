-- Calendar foundational tables and views

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_layer_type') THEN
    CREATE TYPE calendar_layer_type AS ENUM ('personal', 'team', 'project', 'workspace', 'external');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_event_status') THEN
    CREATE TYPE calendar_event_status AS ENUM ('confirmed', 'tentative', 'cancelled', 'milestone', 'busy');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_event_priority') THEN
    CREATE TYPE calendar_event_priority AS ENUM ('low', 'normal', 'high', 'critical');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_event_visibility') THEN
    CREATE TYPE calendar_event_visibility AS ENUM ('private', 'team', 'project', 'workspace', 'org');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_event_type') THEN
    CREATE TYPE calendar_event_type AS ENUM ('meeting', 'task', 'milestone', 'sprint', 'release', 'focus', 'availability');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_reminder_method') THEN
    CREATE TYPE calendar_reminder_method AS ENUM ('popup', 'email', 'push', 'slack', 'webhook');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_resource_type') THEN
    CREATE TYPE calendar_resource_type AS ENUM ('room', 'equipment', 'virtual');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_conflict_preference') THEN
    CREATE TYPE calendar_conflict_preference AS ENUM ('platform', 'external');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_automation_trigger') THEN
    CREATE TYPE calendar_automation_trigger AS ENUM ('event-created', 'event-updated', 'event-starting', 'event-conflict', 'external-sync');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_automation_action') THEN
    CREATE TYPE calendar_automation_action AS ENUM ('create-task', 'post-channel', 'add-to-sprint', 'notify-owner');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_share_role') THEN
    CREATE TYPE calendar_share_role AS ENUM ('viewer', 'editor', 'manager');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_share_target_type') THEN
    CREATE TYPE calendar_share_target_type AS ENUM ('user', 'team', 'group', 'external');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_availability_type') THEN
    CREATE TYPE calendar_availability_type AS ENUM ('busy', 'free', 'ooo');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_notification_status') THEN
    CREATE TYPE calendar_notification_status AS ENUM ('pending', 'snoozed', 'sent');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_delegation_scope') THEN
    CREATE TYPE calendar_delegation_scope AS ENUM ('view', 'edit', 'manage');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_rsvp_status') THEN
    CREATE TYPE calendar_rsvp_status AS ENUM ('accepted', 'declined', 'tentative', 'needs-action');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_integration_provider') THEN
    CREATE TYPE calendar_integration_provider AS ENUM ('google', 'outlook', 'apple');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_integration_status') THEN
    CREATE TYPE calendar_integration_status AS ENUM ('disconnected', 'connecting', 'connected', 'syncing', 'error');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_out_of_office_status') THEN
    CREATE TYPE calendar_out_of_office_status AS ENUM ('scheduled', 'active', 'completed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_scheduling_suggestion_type') THEN
    CREATE TYPE calendar_scheduling_suggestion_type AS ENUM ('primary', 'alternative');
  END IF;
END $$;

-- Core tables
CREATE TABLE IF NOT EXISTS public.calendar_layers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type calendar_layer_type NOT NULL,
  color text NOT NULL,
  timezone text,
  subscribed boolean NOT NULL DEFAULT true,
  visible boolean NOT NULL DEFAULT true,
  is_read_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id uuid NOT NULL REFERENCES public.calendar_layers(id) ON DELETE CASCADE,
  project_id text,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  timezone text,
  location text,
  organizer text,
  color text,
  priority calendar_event_priority,
  visibility calendar_event_visibility,
  status calendar_event_status,
  type calendar_event_type,
  recurrence_rule text,
  recurrence_exceptions text[],
  is_recurring_instance boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  owner_id text,
  owner_name text,
  team_id text,
  team_name text,
  labels text[],
  video_link text,
  sync_source calendar_integration_provider,
  external_id text,
  working_hours_impact text,
  is_deadline boolean NOT NULL DEFAULT false,
  is_release_window boolean NOT NULL DEFAULT false,
  is_recurring_exception boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.calendar_event_attendees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  attendee_id text,
  name text NOT NULL,
  email text,
  response calendar_rsvp_status,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_resources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type calendar_resource_type NOT NULL,
  capacity integer,
  location text,
  color text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_event_resources (
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.calendar_resources(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, resource_id)
);

CREATE TABLE IF NOT EXISTS public.calendar_event_reminders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  offset_minutes integer NOT NULL,
  method calendar_reminder_method NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_event_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  size bigint,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_event_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  link_type text NOT NULL,
  label text NOT NULL,
  href text
);

CREATE TABLE IF NOT EXISTS public.calendar_availability_blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  availability_type calendar_availability_type NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  channel calendar_reminder_method NOT NULL,
  status calendar_notification_status NOT NULL DEFAULT 'pending',
  action_label text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  author_id text NOT NULL,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  body text NOT NULL,
  mentions jsonb
);

CREATE TABLE IF NOT EXISTS public.calendar_followers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  target jsonb NOT NULL,
  subscribed_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_delegations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id text NOT NULL,
  delegate_id text NOT NULL,
  delegate_name text NOT NULL,
  scope calendar_delegation_scope NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_automation_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger calendar_automation_trigger NOT NULL,
  action calendar_automation_action NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_event_automation_rules (
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.calendar_automation_rules(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, rule_id)
);

CREATE TABLE IF NOT EXISTS public.calendar_share_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendar_id uuid NOT NULL REFERENCES public.calendar_layers(id) ON DELETE CASCADE,
  target jsonb NOT NULL,
  role calendar_share_role NOT NULL,
  can_share boolean NOT NULL DEFAULT false,
  subscribed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  invitee jsonb NOT NULL,
  status calendar_rsvp_status NOT NULL,
  responded_at timestamptz,
  response_note text,
  ics_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider calendar_integration_provider NOT NULL,
  account_email text NOT NULL,
  status calendar_integration_status NOT NULL DEFAULT 'connecting',
  last_sync_at timestamptz,
  sync_error text,
  conflict_preference calendar_conflict_preference NOT NULL DEFAULT 'platform',
  calendars_linked integer,
  scopes text[],
  pending_conflicts integer,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_working_hours (
  owner_id text PRIMARY KEY,
  timezone text NOT NULL,
  days jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_holidays (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  holiday_date date NOT NULL,
  region text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.calendar_out_of_office (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  message text,
  status calendar_out_of_office_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.calendar_scheduling_suggestions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  attendee_ids text[] NOT NULL,
  score numeric NOT NULL,
  reason text,
  suggestion_type calendar_scheduling_suggestion_type NOT NULL,
  conflicts text[],
  generated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Views
CREATE OR REPLACE VIEW public.calendar_events_with_details AS
SELECT
  e.id,
  e.calendar_id,
  e.project_id,
  e.title,
  e.description,
  e.start_at AS start,
  e.end_at AS "end",
  e.all_day,
  e.timezone,
  e.location,
  e.organizer,
  e.color,
  e.priority,
  e.visibility,
  e.status,
  e.type,
  e.recurrence_rule,
  e.recurrence_exceptions,
  e.is_recurring_instance,
  e.metadata,
  e.created_at,
  e.updated_at,
  e.owner_id,
  e.owner_name,
  e.team_id,
  e.team_name,
  e.labels,
  e.video_link,
  e.sync_source,
  e.external_id,
  e.working_hours_impact,
  e.is_deadline,
  e.is_release_window,
  e.is_recurring_exception,
  e.completed,
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', a.attendee_id,
    'name', a.name,
    'email', a.email,
    'response', a.response
  )) FILTER (WHERE a.id IS NOT NULL), '[]'::jsonb) AS attendees,
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', r.id,
    'offsetMinutes', r.offset_minutes,
    'method', r.method
  )) FILTER (WHERE r.id IS NOT NULL), '[]'::jsonb) AS reminders,
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', att.id,
    'name', att.name,
    'url', att.url,
    'size', att.size
  )) FILTER (WHERE att.id IS NOT NULL), '[]'::jsonb) AS attachments,
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', l.id,
    'type', l.link_type,
    'label', l.label,
    'href', l.href
  )) FILTER (WHERE l.id IS NOT NULL), '[]'::jsonb) AS linked_items,
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', res.id,
    'name', res.name,
    'type', res.type,
    'capacity', res.capacity,
    'location', res.location,
    'color', res.color
  )) FILTER (WHERE res.id IS NOT NULL), '[]'::jsonb) AS resources,
  COALESCE(array_agg(DISTINCT res.id::text) FILTER (WHERE res.id IS NOT NULL), '{}') AS resource_ids,
  COALESCE(array_agg(DISTINCT ear.rule_id::text) FILTER (WHERE ear.rule_id IS NOT NULL), '{}') AS automation_rule_ids,
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', inv.id,
    'eventId', inv.event_id,
    'invitee', inv.invitee,
    'status', inv.status,
    'respondedAt', inv.responded_at,
    'responseNote', inv.response_note,
    'icsUrl', inv.ics_url
  )) FILTER (WHERE inv.id IS NOT NULL), '[]'::jsonb) AS invitations,
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', fol.id,
    'target', fol.target,
    'subscribedAt', fol.subscribed_at
  )) FILTER (WHERE fol.id IS NOT NULL), '[]'::jsonb) AS followers,
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', com.id,
    'eventId', com.event_id,
    'authorId', com.author_id,
    'authorName', com.author_name,
    'createdAt', com.created_at,
    'body', com.body,
    'mentions', com.mentions
  ) ORDER BY com.created_at) FILTER (WHERE com.id IS NOT NULL), '[]'::jsonb) AS comments,
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
    'id', share.id,
    'calendarId', share.calendar_id,
    'target', share.target,
    'role', share.role,
    'canShare', share.can_share,
    'subscribed', share.subscribed
  )) FILTER (WHERE share.id IS NOT NULL), '[]'::jsonb) AS privacy_overrides,
  COUNT(DISTINCT att.id) > 0 AS has_attachments,
  COUNT(DISTINCT r.id) > 0 AS has_reminders,
  CASE
    WHEN e.status = 'confirmed' THEN '#2563eb'
    WHEN e.status = 'tentative' THEN '#facc15'
    WHEN e.status = 'cancelled' THEN '#9ca3af'
    WHEN e.status = 'milestone' THEN '#d946ef'
    WHEN e.status = 'busy' THEN '#f97316'
    ELSE NULL
  END AS status_color,
  CASE
    WHEN e.priority = 'low' THEN '#22c55e'
    WHEN e.priority = 'normal' THEN '#0ea5e9'
    WHEN e.priority = 'high' THEN '#f97316'
    WHEN e.priority = 'critical' THEN '#ef4444'
    ELSE NULL
  END AS priority_color,
  CASE
    WHEN e.type = 'meeting' THEN '#3b82f6'
    WHEN e.type = 'task' THEN '#6366f1'
    WHEN e.type = 'milestone' THEN '#d946ef'
    WHEN e.type = 'sprint' THEN '#22d3ee'
    WHEN e.type = 'release' THEN '#facc15'
    WHEN e.type = 'focus' THEN '#16a34a'
    WHEN e.type = 'availability' THEN '#94a3b8'
    ELSE NULL
  END AS type_color
FROM public.calendar_events e
LEFT JOIN public.calendar_event_attendees a ON a.event_id = e.id
LEFT JOIN public.calendar_event_reminders r ON r.event_id = e.id
LEFT JOIN public.calendar_event_attachments att ON att.event_id = e.id
LEFT JOIN public.calendar_event_links l ON l.event_id = e.id
LEFT JOIN public.calendar_event_resources er ON er.event_id = e.id
LEFT JOIN public.calendar_resources res ON res.id = er.resource_id
LEFT JOIN public.calendar_event_automation_rules ear ON ear.event_id = e.id
LEFT JOIN public.calendar_invitations inv ON inv.event_id = e.id
LEFT JOIN public.calendar_followers fol ON fol.event_id = e.id
LEFT JOIN public.calendar_comments com ON com.event_id = e.id
LEFT JOIN public.calendar_share_settings share ON share.calendar_id = e.calendar_id
GROUP BY e.id;

CREATE OR REPLACE VIEW public.calendar_layers_with_preferences AS
SELECT
  l.id,
  l.workspace_id,
  l.name,
  l.description,
  l.type,
  l.color,
  l.timezone,
  l.subscribed,
  l.visible,
  l.is_read_only,
  l.created_at,
  l.updated_at
FROM public.calendar_layers l;

CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON public.calendar_events (start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON public.calendar_events (calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_notifications_event ON public.calendar_notifications (event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_comments_event ON public.calendar_comments (event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_followers_event ON public.calendar_followers (event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_attendees_event ON public.calendar_event_attendees (event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_reminders_event ON public.calendar_event_reminders (event_id);

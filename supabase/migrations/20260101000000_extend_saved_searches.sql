-- 20260101000000_extend_saved_searches.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type typ
    JOIN pg_namespace nsp ON nsp.oid = typ.typnamespace
    WHERE nsp.nspname = 'public'
      AND typ.typname = 'saved_search_visibility'
  ) THEN
    CREATE TYPE public.saved_search_visibility AS ENUM ('private', 'team', 'project', 'org');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type typ
    JOIN pg_namespace nsp ON nsp.oid = typ.typnamespace
    WHERE nsp.nspname = 'public'
      AND typ.typname = 'saved_search_owner_type'
  ) THEN
    CREATE TYPE public.saved_search_owner_type AS ENUM ('user', 'team', 'project', 'org');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type typ
    JOIN pg_namespace nsp ON nsp.oid = typ.typnamespace
    WHERE nsp.nspname = 'public'
      AND typ.typname = 'saved_search_alert_frequency'
  ) THEN
    CREATE TYPE public.saved_search_alert_frequency AS ENUM ('off', 'immediate', 'hourly', 'daily', 'weekly');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type typ
    JOIN pg_namespace nsp ON nsp.oid = typ.typnamespace
    WHERE nsp.nspname = 'public'
      AND typ.typname = 'saved_search_alert_channel'
  ) THEN
    CREATE TYPE public.saved_search_alert_channel AS ENUM ('email', 'slack', 'webhook');
  END IF;

  ALTER TABLE public.saved_searches
    ADD COLUMN IF NOT EXISTS visibility public.saved_search_visibility NOT NULL DEFAULT 'private',
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS parameter_tokens jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS owner_type public.saved_search_owner_type NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS owner_id uuid,
    ADD COLUMN IF NOT EXISTS shared_slug text,
    ADD COLUMN IF NOT EXISTS shared_url text,
    ADD COLUMN IF NOT EXISTS alert_frequency public.saved_search_alert_frequency NOT NULL DEFAULT 'off',
    ADD COLUMN IF NOT EXISTS alert_thresholds jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS alert_channels public.saved_search_alert_channel[] NOT NULL DEFAULT ARRAY[]::public.saved_search_alert_channel[],
    ADD COLUMN IF NOT EXISTS alert_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_by uuid,
    ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_alert_sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS masked_fields text[] NOT NULL DEFAULT ARRAY[]::text[];

  CREATE UNIQUE INDEX IF NOT EXISTS saved_searches_shared_slug_idx ON public.saved_searches(shared_slug) WHERE shared_slug IS NOT NULL;
END$$;

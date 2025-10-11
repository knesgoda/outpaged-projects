-- 20251005060000_search_tasks.sql
-- Unified search ingestion pipeline bootstrap

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS search;
CREATE SCHEMA IF NOT EXISTS search_private;

CREATE TABLE IF NOT EXISTS public.search_index_queue (
  queue_id bigserial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  workspace_id uuid,
  op text NOT NULL,
  record jsonb,
  previous jsonb,
  priority smallint NOT NULL DEFAULT 5,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS search_index_queue_next_attempt_idx
  ON public.search_index_queue (next_attempt_at, priority);

CREATE TABLE IF NOT EXISTS public.search_dead_letters (
  dead_letter_id bigserial PRIMARY KEY,
  queue_id bigint NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL,
  error text NOT NULL,
  failed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search.index_documents (
  document_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  tokens text[] NOT NULL DEFAULT '{}',
  stems text[] NOT NULL DEFAULT '{}',
  synonyms text[] NOT NULL DEFAULT '{}',
  dictionaries text[] NOT NULL DEFAULT '{}',
  inverted tsvector,
  metadata jsonb NOT NULL DEFAULT '{}',
  relations text[] NOT NULL DEFAULT '{}',
  permissions jsonb NOT NULL DEFAULT '{}',
  locales text[] NOT NULL DEFAULT '{}',
  indexed_at timestamptz NOT NULL DEFAULT now(),
  exists_signal boolean NOT NULL DEFAULT true,
  masked_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS index_documents_inverted_idx
  ON search.index_documents USING gin (inverted);

CREATE INDEX IF NOT EXISTS index_documents_tokens_idx
  ON search.index_documents USING gin (tokens);

CREATE TABLE IF NOT EXISTS search.index_columnar (
  document_id uuid PRIMARY KEY REFERENCES search.index_documents(document_id) ON DELETE CASCADE,
  columnar jsonb NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS search.index_vectors (
  document_id uuid PRIMARY KEY REFERENCES search.index_documents(document_id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL
);

CREATE OR REPLACE FUNCTION search_private.route_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payload jsonb;
  entity_id uuid;
  workspace_id uuid;
  id_column text := TG_ARGV[1];
  workspace_column text := NULLIF(TG_ARGV[2], '');
BEGIN
  IF TG_OP = 'DELETE' THEN
    payload := to_jsonb(OLD);
  ELSE
    payload := to_jsonb(NEW);
  END IF;

  IF payload ? id_column THEN
    entity_id := (payload ->> id_column)::uuid;
  ELSE
    RAISE WARNING 'Search index trigger missing id column % for table %', id_column, TG_TABLE_NAME;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF workspace_column IS NOT NULL AND payload ? workspace_column THEN
    workspace_id := (payload ->> workspace_column)::uuid;
  END IF;

  INSERT INTO public.search_index_queue AS q (
    entity_type,
    entity_id,
    workspace_id,
    op,
    record,
    previous,
    priority,
    next_attempt_at,
    attempts,
    max_attempts
  )
  VALUES (
    TG_ARGV[0],
    entity_id,
    workspace_id,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    5,
    now(),
    0,
    5
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE
  SET
    workspace_id = EXCLUDED.workspace_id,
    op = EXCLUDED.op,
    record = EXCLUDED.record,
    previous = EXCLUDED.previous,
    next_attempt_at = now(),
    attempts = CASE WHEN q.op <> EXCLUDED.op THEN 0 ELSE q.attempts END,
    locked_at = NULL,
    locked_by = NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION search_private.register_source(
  source_table regclass,
  entity_type text,
  id_column text DEFAULT 'id',
  workspace_column text DEFAULT 'workspace_id'
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  trigger_name text := format('trg_search_%s_queue', replace(entity_type, ' ', '_'));
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trigger_name, source_table);
  EXECUTE format(
    'CREATE TRIGGER %I
       AFTER INSERT OR UPDATE OR DELETE ON %s
       FOR EACH ROW EXECUTE FUNCTION search_private.route_change(%L, %L, %L);',
    trigger_name,
    source_table,
    entity_type,
    id_column,
    COALESCE(workspace_column, '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.search_upsert_index_record(
  p_document_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_workspace_id uuid,
  p_version bigint,
  p_tokens text[],
  p_stems text[],
  p_synonyms text[],
  p_dictionaries text[],
  p_vector double precision[],
  p_columnar jsonb,
  p_inverted text,
  p_metadata jsonb,
  p_relations text[],
  p_permissions jsonb,
  p_locales text[],
  p_indexed_at timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, search, search_private
AS $$
DECLARE
  v_exists boolean := COALESCE((p_permissions ->> 'existsSignal')::boolean, true);
  v_masked jsonb := COALESCE(p_permissions -> 'maskedFields', '{}'::jsonb);
  v_document_id uuid := COALESCE(p_document_id, gen_random_uuid());
  v_embedding double precision[] := CASE
    WHEN p_vector IS NULL OR array_length(p_vector, 1) IS NULL THEN array_fill(0::double precision, ARRAY[1536])
    ELSE p_vector
  END;
BEGIN
  INSERT INTO search.index_documents AS d (
    document_id,
    entity_type,
    entity_id,
    workspace_id,
    version,
    tokens,
    stems,
    synonyms,
    dictionaries,
    inverted,
    metadata,
    relations,
    permissions,
    locales,
    indexed_at,
    exists_signal,
    masked_fields
  )
  VALUES (
    v_document_id,
    p_entity_type,
    p_entity_id,
    p_workspace_id,
    p_version,
    COALESCE(p_tokens, '{}'),
    COALESCE(p_stems, '{}'),
    COALESCE(p_synonyms, '{}'),
    COALESCE(p_dictionaries, '{}'),
    to_tsvector('simple', COALESCE(p_inverted, '')),
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_relations, '{}'),
    COALESCE(p_permissions, '{}'::jsonb),
    COALESCE(p_locales, '{}'),
    p_indexed_at,
    v_exists,
    v_masked
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE
  SET
    document_id = EXCLUDED.document_id,
    version = EXCLUDED.version,
    tokens = EXCLUDED.tokens,
    stems = EXCLUDED.stems,
    synonyms = EXCLUDED.synonyms,
    dictionaries = EXCLUDED.dictionaries,
    inverted = EXCLUDED.inverted,
    metadata = EXCLUDED.metadata,
    relations = EXCLUDED.relations,
    permissions = EXCLUDED.permissions,
    locales = EXCLUDED.locales,
    indexed_at = EXCLUDED.indexed_at,
    exists_signal = EXCLUDED.exists_signal,
    masked_fields = EXCLUDED.masked_fields;

  INSERT INTO search.index_columnar (document_id, columnar, metadata)
  VALUES (
    v_document_id,
    COALESCE(p_columnar, '{}'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (document_id) DO UPDATE
  SET
    columnar = EXCLUDED.columnar,
    metadata = EXCLUDED.metadata;

  INSERT INTO search.index_vectors (document_id, embedding)
  VALUES (
    v_document_id,
    v_embedding::vector(1536)
  )
  ON CONFLICT (document_id) DO UPDATE
  SET embedding = EXCLUDED.embedding;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    ALTER TABLE public.tasks DROP COLUMN IF EXISTS search;
    DROP TRIGGER IF EXISTS trg_tasks_tsv ON public.tasks;
    DROP FUNCTION IF EXISTS public.tasks_tsv_update();
    PERFORM search_private.register_source('public.tasks', 'task', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.items') IS NOT NULL THEN
    PERFORM search_private.register_source('public.items', 'item', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.subitems') IS NOT NULL THEN
    PERFORM search_private.register_source('public.subitems', 'subitem', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.epics') IS NOT NULL THEN
    PERFORM search_private.register_source('public.epics', 'epic', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.wiki_pages') IS NOT NULL THEN
    PERFORM search_private.register_source('public.wiki_pages', 'wiki', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.doc_versions') IS NOT NULL THEN
    PERFORM search_private.register_source('public.doc_versions', 'doc_version', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.file_versions') IS NOT NULL THEN
    PERFORM search_private.register_source('public.file_versions', 'file_version', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.boards') IS NOT NULL THEN
    PERFORM search_private.register_source('public.boards', 'board', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.views') IS NOT NULL THEN
    PERFORM search_private.register_source('public.views', 'view', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.reports') IS NOT NULL THEN
    PERFORM search_private.register_source('public.reports', 'report', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.dashboards') IS NOT NULL THEN
    PERFORM search_private.register_source('public.dashboards', 'dashboard', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.automations') IS NOT NULL THEN
    PERFORM search_private.register_source('public.automations', 'automation', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.calendars') IS NOT NULL THEN
    PERFORM search_private.register_source('public.calendars', 'calendar', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.integrations') IS NOT NULL THEN
    PERFORM search_private.register_source('public.integrations', 'integration', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    PERFORM search_private.register_source('public.audit_logs', 'audit_log', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.admin_objects') IS NOT NULL THEN
    PERFORM search_private.register_source('public.admin_objects', 'admin_object', 'id', 'workspace_id');
  END IF;

  IF to_regclass('public.teams') IS NOT NULL THEN
    PERFORM search_private.register_source('public.teams', 'team', 'id', 'workspace_id');
  END IF;
END $$;

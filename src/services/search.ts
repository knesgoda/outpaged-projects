import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient, PostgrestFilterBuilder } from '@supabase/supabase-js';
import type { SearchResult } from '@/types';
import { escapeLikePattern, mapSupabaseError, normalizeSearchTerm } from './utils';

const DEFAULT_RESULT_LIMIT = 20;

export type SearchContext = {
  projectId?: string;
  client?: SupabaseClient<any, any, any>;
  limit?: number;
};

type DocumentSearchRow = {
  id: string;
  title: string;
  snippet?: string | null;
  url?: string | null;
  project_id?: string | null;
  updated_at?: string | null;
  score?: number | null;
};

type FileSearchRow = {
  id: string;
  title?: string | null;
  path?: string | null;
  url?: string | null;
  project_id?: string | null;
  updated_at?: string | null;
  size_bytes?: number | null;
  score?: number | null;
};

type CommentSearchRow = {
  id: string;
  body?: string | null;
  url?: string | null;
  project_id?: string | null;
  updated_at?: string | null;
  score?: number | null;
};

type AnyQueryBuilder<Row> = PostgrestFilterBuilder<any, Row, any>;

const getClient = (ctx: SearchContext): SupabaseClient<any, any, any> =>
  (ctx.client ?? (supabase as SupabaseClient<any, any, any>));

const getLimit = (ctx: SearchContext) => {
  const limit = ctx.limit ?? DEFAULT_RESULT_LIMIT;
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_RESULT_LIMIT;
};

const applyProjectFilter = <Row>(query: AnyQueryBuilder<Row>, ctx: SearchContext) => {
  if (!ctx.projectId) {
    return query;
  }
  return query.eq('project_id', ctx.projectId);
};

const runQuery = async <Row>(
  query: AnyQueryBuilder<Row>,
  fallbackMessage: string,
): Promise<Row[]> => {
  const { data, error } = await query;
  if (error) {
    throw mapSupabaseError(error, fallbackMessage);
  }
  return (data ?? []) as Row[];
};

const mapDocumentRow = (row: DocumentSearchRow): SearchResult => ({
  id: row.id,
  type: 'doc',
  title: row.title,
  snippet: row.snippet ?? null,
  url: row.url ?? `/docs/${row.id}`,
  project_id: row.project_id ?? null,
  updated_at: row.updated_at ?? null,
  score: row.score ?? undefined,
});

const mapFileRow = (row: FileSearchRow): SearchResult => ({
  id: row.id,
  type: 'file',
  title: row.title ?? row.path ?? 'File',
  snippet: row.path ?? null,
  url: row.url ?? row.path ?? `/files/${row.id}`,
  project_id: row.project_id ?? null,
  updated_at: row.updated_at ?? null,
  score: row.score ?? undefined,
});

const mapCommentRow = (row: CommentSearchRow): SearchResult => ({
  id: row.id,
  type: 'comment',
  title: 'Comment',
  snippet: row.body ?? null,
  url: row.url ?? `/comments/${row.id}`,
  project_id: row.project_id ?? null,
  updated_at: row.updated_at ?? null,
  score: row.score ?? undefined,
});

export async function searchDocs(term: string, ctx: SearchContext = {}): Promise<SearchResult[]> {
  const normalized = normalizeSearchTerm(term);
  if (!normalized) {
    return [];
  }

  const client = getClient(ctx);
  const limit = getLimit(ctx);

  let query = client
    .from<DocumentSearchRow>('documents_search')
    .select('id, title, snippet, url, project_id, updated_at, score')
    .textSearch('content', normalized, { type: 'websearch' });

  query = applyProjectFilter(query, ctx)
    .order('score', { ascending: false })
    .limit(limit);

  const rows = await runQuery(query, 'Unable to search documents.');
  return rows.map(mapDocumentRow);
}

export async function searchFiles(term: string, ctx: SearchContext = {}): Promise<SearchResult[]> {
  const normalized = normalizeSearchTerm(term);
  if (!normalized) {
    return [];
  }

  const client = getClient(ctx);
  const limit = getLimit(ctx);
  const pattern = `%${escapeLikePattern(normalized)}%`;

  let query = client
    .from<FileSearchRow>('project_files')
    .select('id, title, path, url, project_id, updated_at, size_bytes, score')
    .or(`title.ilike.${pattern},path.ilike.${pattern}`);

  query = applyProjectFilter(query, ctx)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  const rows = await runQuery(query, 'Unable to search files.');
  return rows.map(mapFileRow);
}

export async function searchComments(term: string, ctx: SearchContext = {}): Promise<SearchResult[]> {
  const normalized = normalizeSearchTerm(term);
  if (!normalized) {
    return [];
  }

  const client = getClient(ctx);
  const limit = getLimit(ctx);

  let query = client
    .from<CommentSearchRow>('comment_search')
    .select('id, body, url, project_id, updated_at, score')
    .textSearch('body', normalized, { type: 'websearch' });

  query = applyProjectFilter(query, ctx)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  const rows = await runQuery(query, 'Unable to search comments.');
  return rows.map(mapCommentRow);
}

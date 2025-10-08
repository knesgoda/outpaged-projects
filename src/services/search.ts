import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import type { SearchResult } from "@/types";

const DEFAULT_LIMIT = 10;
const SUPPORTED_TYPES: SearchResult["type"][] = [
  "task",
  "project",
  "doc",
  "file",
  "comment",
  "person",
];

type SearchParams = {
  q: string;
  limit?: number;
  projectId?: string;
  types?: Array<SearchResult["type"]>;
  includeComments?: boolean;
};

type Suggestion = Pick<SearchResult, "type" | "title" | "url">;

type QueryContext = {
  limit: number;
  ts: string;
  ilike: string;
  projectId?: string;
  query: string;
};

type QueryBuilder<T> = (
  client: SupabaseClient<any>,
  ctx: QueryContext
) => Promise<T[]>;

export const normalizeQuery = (input: string): { ts: string; ilike: string } => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ts: "", ilike: "" };
  }

  const cleaned = trimmed
    .replace(/["'`~!@#$%^&*()+=\[\]{}|\\:;<>?/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tsTerms = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `${term}:*`);

  const ts = tsTerms.join(" & ");
  const ilike = `%${cleaned.replace(/[%_]/g, (match) => `\\${match}`)}%`;

  return { ts, ilike };
};

const buildWithFallback = async <T>(
  ctx: QueryContext,
  buildTsQuery: () => Promise<{ data: T[] | null; error: any }>,
  buildIlikeQuery: () => Promise<{ data: T[] | null; error: any }>
): Promise<T[]> => {
  if (!supabaseConfigured) {
    return [];
  }

  if (ctx.ts) {
    try {
      const { data, error } = await buildTsQuery();
      if (!error && data?.length) {
        return data;
      }
    } catch (error) {
      console.warn("Search TS query failed", error);
    }
  }

  try {
    const { data, error } = await buildIlikeQuery();
    if (error) {
      console.warn("Search ILIKE query failed", error);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.warn("Search ILIKE query threw", error);
    return [];
  }
};

const selectWithRank = (columns: string[], ts: string) => {
  const rankExpression = ts
    ? `, ts_rank(search, to_tsquery('simple', '${ts.replace(/'/g, "''")}')) as score`
    : ", NULL::float as score";
  return `${columns.join(", ")}${rankExpression}`;
};

const stripMarkdown = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }
  return value
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/\!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, "$1")
    .replace(/[#*_>~`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const createSnippet = (value: string | null | undefined, query: string, maxLength = 160) => {
  const cleaned = stripMarkdown(value);
  if (!cleaned) {
    return null;
  }
  if (!query.trim()) {
    return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned;
  }
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const lower = cleaned.toLowerCase();
  for (const term of terms) {
    const index = lower.indexOf(term.toLowerCase());
    if (index !== -1) {
      const start = Math.max(0, index - 60);
      const end = Math.min(cleaned.length, index + term.length + 60);
      let excerpt = cleaned.slice(start, end);
      if (start > 0) {
        excerpt = `…${excerpt}`;
      }
      if (end < cleaned.length) {
        excerpt = `${excerpt}…`;
      }
      return excerpt.length > maxLength ? `${excerpt.slice(0, maxLength)}…` : excerpt;
    }
  }

  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}…` : cleaned;
};

const searchTasks = async (
  client: SupabaseClient<any>,
  ctx: QueryContext
): Promise<SearchResult[]> => {
  const columns = selectWithRank(
    ["id", "title", "description", "project_id", "updated_at"],
    ctx.ts
  );

  const getBaseQuery = () => {
    let query = client.from("tasks").select(columns);
    if (ctx.projectId) {
      query = query.eq("project_id", ctx.projectId);
    }
    return query;
  };

  const rows = await buildWithFallback(
    ctx,
    () =>
      getBaseQuery()
        .textSearch("search", ctx.ts, { config: "simple", type: "raw" })
        .order("score", { ascending: false, nullsLast: true })
        .limit(ctx.limit),
    () =>
      getBaseQuery()
        .or(`title.ilike.${ctx.ilike},description.ilike.${ctx.ilike}`)
        .order("updated_at", { ascending: false, nullsLast: true })
        .limit(ctx.limit)
  );

  return rows
    .map((row: any) => {
      const title = row.title || "Untitled task";
      const projectId = row.project_id ?? undefined;
      const url = projectId
        ? `/projects/${projectId}/board?task=${row.id}`
        : `/tasks/${row.id}`;
      const result: SearchResult = {
        id: row.id,
        type: "task",
        title,
        snippet: createSnippet(row.description, ctx.query),
        url,
        project_id: projectId,
        updated_at: row.updated_at ?? null,
        score: typeof row.score === "number" ? row.score : undefined,
      };
      return result;
    })
    .filter(Boolean);
};

const searchProjects = async (
  client: SupabaseClient<any>,
  ctx: QueryContext
): Promise<SearchResult[]> => {
  const columns = selectWithRank(
    ["id", "name", "description", "updated_at"],
    ctx.ts
  );

  const getBaseQuery = () => client.from("projects").select(columns);

  const rows = await buildWithFallback(
    ctx,
    () =>
      getBaseQuery()
        .textSearch("search", ctx.ts, { config: "simple", type: "raw" })
        .order("score", { ascending: false, nullsLast: true })
        .limit(ctx.limit),
    () =>
      getBaseQuery()
        .or(`name.ilike.${ctx.ilike},description.ilike.${ctx.ilike}`)
        .order("updated_at", { ascending: false, nullsLast: true })
        .limit(ctx.limit)
  );

  return rows.map((row: any) => ({
    id: row.id,
    type: "project",
    title: row.name ?? "Untitled project",
    snippet: createSnippet(row.description, ctx.query),
    url: `/projects/${row.id}`,
    updated_at: row.updated_at ?? null,
    score: typeof row.score === "number" ? row.score : undefined,
  }));
};

export const searchDocs = async (
  client: SupabaseClient<any>,
  ctx: QueryContext
): Promise<SearchResult[]> => {
  const columns = selectWithRank(
    ["id", "title", "body_markdown", "project_id", "updated_at"],
    ctx.ts
  );

  const getBaseQuery = () => {
    let query = client.from("doc_pages").select(columns);
    if (ctx.projectId) {
      query = query.eq("project_id", ctx.projectId);
    }
    return query;
  };

  const rows = await buildWithFallback(
    ctx,
    () =>
      getBaseQuery()
        .textSearch("search", ctx.ts, { config: "simple", type: "raw" })
        .order("score", { ascending: false, nullsLast: true })
        .limit(ctx.limit),
    () =>
      getBaseQuery()
        .or(`title.ilike.${ctx.ilike},body_markdown.ilike.${ctx.ilike}`)
        .order("updated_at", { ascending: false, nullsLast: true })
        .limit(ctx.limit)
  );

  return rows.map((row: any) => {
    const projectId = row.project_id ?? undefined;
    const baseUrl = projectId
      ? `/projects/${projectId}/docs/${row.id}`
      : `/docs/${row.id}`;
    return {
      id: row.id,
      type: "doc",
      title: row.title ?? "Untitled doc",
      snippet: createSnippet(row.body_markdown, ctx.query),
      url: baseUrl,
      project_id: projectId,
      updated_at: row.updated_at ?? null,
      score: typeof row.score === "number" ? row.score : undefined,
    } satisfies SearchResult;
  });
};

export const searchFiles = async (
  client: SupabaseClient<any>,
  ctx: QueryContext
): Promise<SearchResult[]> => {
  const columns = selectWithRank(
    ["id", "title", "path", "project_id", "updated_at"],
    ctx.ts
  );

  const getBaseQuery = () => {
    let query = client.from("project_files").select(columns);
    if (ctx.projectId) {
      query = query.eq("project_id", ctx.projectId);
    }
    return query;
  };

  const rows = await buildWithFallback(
    ctx,
    () =>
      getBaseQuery()
        .textSearch("search", ctx.ts, { config: "simple", type: "raw" })
        .order("score", { ascending: false, nullsLast: true })
        .limit(ctx.limit),
    () =>
      getBaseQuery()
        .or(`title.ilike.${ctx.ilike},path.ilike.${ctx.ilike}`)
        .order("updated_at", { ascending: false, nullsLast: true })
        .limit(ctx.limit)
  );

  return rows.map((row: any) => {
    const projectId = row.project_id ?? undefined;
    const baseUrl = projectId
      ? `/projects/${projectId}/files?file=${encodeURIComponent(row.id)}`
      : `/files?file=${encodeURIComponent(row.id)}`;
    return {
      id: row.id,
      type: "file",
      title: row.title ?? row.path ?? "File",
      snippet: createSnippet(row.path, ctx.query),
      url: baseUrl,
      project_id: projectId,
      updated_at: row.updated_at ?? null,
      score: typeof row.score === "number" ? row.score : undefined,
    } satisfies SearchResult;
  });
};

const resolveCommentUrl = (row: any): string | null => {
  const entityType = row.entity_type as string | null;
  const entityId = row.entity_id as string | null;
  if (!entityType || !entityId) {
    return null;
  }

  switch (entityType) {
    case "task":
      return row.project_id
        ? `/projects/${row.project_id}/board?task=${entityId}`
        : `/tasks/${entityId}`;
    case "project":
      return `/projects/${entityId}`;
    case "doc":
      return row.project_id
        ? `/projects/${row.project_id}/docs/${entityId}`
        : `/docs/${entityId}`;
    default:
      return null;
  }
};

export const searchComments = async (
  client: SupabaseClient<any>,
  ctx: QueryContext
): Promise<SearchResult[]> => {
  const columns = selectWithRank(
    [
      "id",
      "body_markdown",
      "entity_type",
      "entity_id",
      "project_id",
      "updated_at",
    ],
    ctx.ts
  );

  const getBaseQuery = () => {
    let query = client.from("comments").select(columns);
    if (ctx.projectId) {
      query = query.eq("project_id", ctx.projectId);
    }
    return query;
  };

  const rows = await buildWithFallback(
    ctx,
    () =>
      getBaseQuery()
        .textSearch("search", ctx.ts, { config: "simple", type: "raw" })
        .order("score", { ascending: false, nullsLast: true })
        .limit(ctx.limit),
    () =>
      getBaseQuery()
        .filter("body_markdown", "ilike", ctx.ilike)
        .order("updated_at", { ascending: false, nullsLast: true })
        .limit(ctx.limit)
  );

  return rows
    .map((row: any) => {
      const url = resolveCommentUrl(row);
      if (!url) {
        return null;
      }
      return {
        id: row.id,
        type: "comment",
        title: "Comment",
        snippet: createSnippet(row.body_markdown, ctx.query),
        url,
        project_id: row.project_id ?? undefined,
        updated_at: row.updated_at ?? null,
        score: typeof row.score === "number" ? row.score : undefined,
      } satisfies SearchResult;
    })
    .filter((item): item is SearchResult => Boolean(item));
};

const searchProfiles = async (
  client: SupabaseClient<any>,
  ctx: QueryContext
): Promise<SearchResult[]> => {
  const columns = selectWithRank(
    ["id", "full_name", "title", "department", "updated_at"],
    ctx.ts
  );

  const getBaseQuery = () => client.from("profiles").select(columns);

  const rows = await buildWithFallback(
    ctx,
    () =>
      getBaseQuery()
        .textSearch("search", ctx.ts, { config: "simple", type: "raw" })
        .order("score", { ascending: false, nullsLast: true })
        .limit(ctx.limit),
    () =>
      getBaseQuery()
        .or(
          `full_name.ilike.${ctx.ilike},title.ilike.${ctx.ilike},department.ilike.${ctx.ilike}`
        )
        .order("updated_at", { ascending: false, nullsLast: true })
        .limit(ctx.limit)
  );

  return rows.map((row: any) => ({
    id: row.id,
    type: "person",
    title: row.full_name ?? "Team member",
    snippet: createSnippet(
      [row.title, row.department].filter(Boolean).join(" • "),
      ctx.query
    ),
    url: `/people/${row.id}`,
    updated_at: row.updated_at ?? null,
    score: typeof row.score === "number" ? row.score : undefined,
  }));
};

const typeToSearchFn: Record<SearchResult["type"], QueryBuilder<any>> = {
  task: searchTasks,
  project: searchProjects,
  doc: searchDocs,
  file: searchFiles,
  comment: searchComments,
  person: searchProfiles,
  team_member: searchProfiles,
};

export const searchAll = async ({
  q,
  limit = DEFAULT_LIMIT,
  projectId,
  types,
  includeComments,
}: SearchParams): Promise<SearchResult[]> => {
  if (!q.trim()) {
    return [];
  }

  const normalizedTypes = (types ?? SUPPORTED_TYPES).filter((type) =>
    SUPPORTED_TYPES.includes(type)
  );

  const { ts, ilike } = normalizeQuery(q);
  const ctx: QueryContext = { limit, ts, ilike, projectId, query: q };
  const client = supabase as SupabaseClient<any>;

  const tasksToRun = normalizedTypes.filter((type) =>
    type !== "comment" ? true : includeComments ?? true
  );

  const queries = tasksToRun.map((type) =>
    typeToSearchFn[type](client, ctx).catch((error) => {
      console.warn(`Search query failed for ${type}`, error);
      return [];
    })
  );

  const results = await Promise.all(queries);

  const merged = new Map<string, SearchResult>();
  results.flat().forEach((item) => {
    const key = `${item.type}:${item.id}`;
    const existing = merged.get(key);
    if (!existing || (item.score ?? 0) > (existing.score ?? 0)) {
      merged.set(key, item);
    }
  });

  return Array.from(merged.values()).sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    const timeA = a.updated_at ? Date.parse(a.updated_at) : 0;
    const timeB = b.updated_at ? Date.parse(b.updated_at) : 0;
    return timeB - timeA;
  });
};

export const searchSuggest = async (
  q: string
): Promise<Suggestion[]> => {
  const results = await searchAll({
    q,
    limit: 5,
    includeComments: false,
  });

  return results.slice(0, 5).map(({ type, title, url }) => ({
    type,
    title,
    url,
  }));
};
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


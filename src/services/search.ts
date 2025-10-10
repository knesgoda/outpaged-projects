import { supabase } from "@/integrations/supabase/client";
import type { SearchResult } from "@/types";
import { escapeLikePattern, normalizeSearchTerm } from "./utils";

const DEFAULT_LIMIT = 20;
const SUGGEST_LIMIT = 6;
const SEARCH_COLUMN = "search";

const ALL_TYPES: ReadonlyArray<SearchResult["type"]> = [
  "task",
  "project",
  "doc",
  "file",
  "comment",
  "person",
  "team_member",
];

type QueryBuilder<T = any> = {
  select: (...args: any[]) => QueryBuilder<T>;
  order: (...args: any[]) => QueryBuilder<T>;
  eq: (...args: any[]) => QueryBuilder<T>;
  ilike: (...args: any[]) => QueryBuilder<T>;
  or: (...args: any[]) => QueryBuilder<T>;
  textSearch: (...args: any[]) => QueryBuilder<T>;
  limit: (count: number) => Promise<{ data: T[] | null; error: { message?: string } | null }>;
};

const formatSnippet = (value?: string | null, maxLength = 160) => {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
};

const applyTextFilters = <T>(
  query: QueryBuilder<T>,
  term: string,
  fields: string[],
  options: { enableTextSearch?: boolean } = {}
) => {
  if (!term) {
    return query;
  }

  const sanitized = escapeLikePattern(term);
  const likePattern = `%${sanitized}%`;
  if (fields.length === 1) {
    query = query.ilike(fields[0], likePattern);
  } else if (fields.length > 1) {
    query = query.or(fields.map((field) => `${field}.ilike.${likePattern}`).join(","));
  }

  if (options.enableTextSearch !== false) {
    try {
      query = query.textSearch(SEARCH_COLUMN, term, { type: "websearch" });
    } catch (_error) {
      // Ignore when running with the Supabase stub
    }
  }

  return query;
};

const mapTaskRow = (row: any): SearchResult => ({
  id: String(row.id),
  type: "task",
  title: row.title ?? "Untitled task",
  snippet: formatSnippet(row.description),
  url: `/tasks/${row.id}`,
  project_id: row.project_id ?? null,
  updated_at: row.updated_at ?? null,
  score: typeof row.rank === "number" ? row.rank : undefined,
});

const mapProjectRow = (row: any): SearchResult => ({
  id: String(row.id),
  type: "project",
  title: row.name ?? row.code ?? "Untitled project",
  snippet: formatSnippet(row.description),
  url: `/projects/${row.id}`,
  project_id: row.id ?? null,
  updated_at: row.updated_at ?? null,
  score: typeof row.rank === "number" ? row.rank : undefined,
});

const mapDocRow = (row: any): SearchResult => ({
  id: String(row.id),
  type: "doc",
  title: row.title ?? "Untitled doc",
  snippet: formatSnippet(row.body_markdown),
  url: `/docs/${row.id}`,
  project_id: row.project_id ?? null,
  updated_at: row.updated_at ?? null,
  score: typeof row.rank === "number" ? row.rank : undefined,
});

const mapFileRow = (row: any): SearchResult => ({
  id: String(row.id),
  type: "file",
  title: (row.title ?? "").trim() || row.path?.split("/").pop() || "Untitled file",
  snippet: formatSnippet(row.path),
  url: row.project_id ? `/projects/${row.project_id}/files` : "/files",
  project_id: row.project_id ?? null,
  updated_at: row.created_at ?? null,
  score: typeof row.rank === "number" ? row.rank : undefined,
});

const mapCommentRow = (row: any): SearchResult => ({
  id: String(row.id),
  type: "comment",
  title: formatSnippet(row.content, 80) ?? "Comment",
  snippet: formatSnippet(row.content),
  url: `/tasks/${row.task_id}#comment-${row.id}`,
  project_id: row.tasks?.project_id ?? null,
  updated_at: row.updated_at ?? null,
  score: typeof row.rank === "number" ? row.rank : undefined,
});

const mapPersonRow = (row: any): SearchResult => ({
  id: String(row.user_id ?? row.id),
  type: "person",
  title: row.full_name ?? row.username ?? "Team member",
  snippet: row.username ? `@${row.username}` : null,
  url: `/team/${row.user_id ?? row.id}`,
  project_id: null,
  updated_at: row.updated_at ?? null,
  score: typeof row.rank === "number" ? row.rank : undefined,
});

const mapTeamMemberRow = (row: any): SearchResult => ({
  id: String(row.user_id ?? row.id),
  type: "team_member",
  title: row.full_name ?? "Project member",
  snippet: row.project_id ? `Member of project ${row.project_id}` : null,
  url: row.project_id ? `/projects/${row.project_id}` : `/team/${row.user_id ?? row.id}`,
  project_id: row.project_id ?? null,
  updated_at: null,
  score: typeof row.rank === "number" ? row.rank : undefined,
});

const execute = async <T>(builder: Promise<{ data: T[] | null; error: { message?: string } | null }>, fallback: string) => {
  const { data, error } = await builder;
  if (error) {
    throw new Error(error.message ?? fallback);
  }
  return (data ?? []) as T[];
};

type SearchTasksParams = {
  query: string;
  projectId?: string;
  limit?: number;
};

export const searchTasks = async ({
  query,
  projectId,
  limit = DEFAULT_LIMIT,
}: SearchTasksParams): Promise<SearchResult[]> => {
  const term = normalizeSearchTerm(query ?? "");
  if (!term) {
    return [];
  }

  let builder = supabase
    .from("tasks" as any)
    .select("id,title,description,project_id,updated_at")
    .order("updated_at", { ascending: false }) as QueryBuilder;

  if (projectId) {
    builder = builder.eq("project_id", projectId) as QueryBuilder;
  }

  builder = applyTextFilters(builder, term, ["title", "description"]);

  const rows = await execute<any>(builder.limit(limit), "Unable to search tasks.");
  return rows.map(mapTaskRow);
};

type SearchProjectsParams = {
  query: string;
  limit?: number;
};

export const searchProjects = async ({
  query,
  limit = DEFAULT_LIMIT,
}: SearchProjectsParams): Promise<SearchResult[]> => {
  const term = normalizeSearchTerm(query ?? "");
  if (!term) {
    return [];
  }

  let builder = supabase
    .from("projects" as any)
    .select("id,name,code,description,updated_at")
    .order("updated_at", { ascending: false }) as QueryBuilder;

  builder = applyTextFilters(builder, term, ["name", "description", "code"]);

  const rows = await execute<any>(builder.limit(limit), "Unable to search projects.");
  return rows.map(mapProjectRow);
};

type SearchDocsParams = {
  query: string;
  projectId?: string;
  limit: number;
};

const searchDocs = async ({ query, projectId, limit }: SearchDocsParams): Promise<SearchResult[]> => {
  const term = normalizeSearchTerm(query ?? "");
  if (!term) {
    return [];
  }

  let builder = supabase
    .from("doc_pages" as any)
    .select("id,title,project_id,body_markdown,updated_at")
    .order("updated_at", { ascending: false }) as QueryBuilder;

  if (projectId) {
    builder = builder.eq("project_id", projectId) as QueryBuilder;
  }

  builder = applyTextFilters(builder, term, ["title", "body_markdown"]);

  const rows = await execute<any>(builder.limit(limit), "Unable to search docs.");
  return rows.map(mapDocRow);
};

type SearchFilesParams = {
  query: string;
  projectId?: string;
  limit: number;
};

const searchFiles = async ({ query, projectId, limit }: SearchFilesParams): Promise<SearchResult[]> => {
  const term = normalizeSearchTerm(query ?? "");
  if (!term) {
    return [];
  }

  let builder = supabase
    .from("project_files" as any)
    .select("id,title,path,project_id,created_at")
    .order("created_at", { ascending: false }) as QueryBuilder;

  if (projectId) {
    builder = builder.eq("project_id", projectId) as QueryBuilder;
  }

  builder = applyTextFilters(builder, term, ["title", "path"], { enableTextSearch: false });

  const rows = await execute<any>(builder.limit(limit), "Unable to search files.");
  return rows.map(mapFileRow);
};

type SearchCommentsParams = {
  query: string;
  projectId?: string;
  limit: number;
};

const searchComments = async ({
  query,
  projectId,
  limit,
}: SearchCommentsParams): Promise<SearchResult[]> => {
  const term = normalizeSearchTerm(query ?? "");
  if (!term) {
    return [];
  }

  let builder = supabase
    .from("comments" as any)
    .select("id,content,task_id,updated_at,tasks:tasks!inner(id,project_id)")
    .order("updated_at", { ascending: false }) as QueryBuilder;

  if (projectId) {
    builder = builder.eq("tasks.project_id", projectId) as QueryBuilder;
  }

  builder = applyTextFilters(builder, term, ["content"]);

  const rows = await execute<any>(builder.limit(limit), "Unable to search comments.");
  return rows.map(mapCommentRow);
};

type SearchPeopleParams = {
  query: string;
  limit: number;
};

const searchPeople = async ({ query, limit }: SearchPeopleParams): Promise<SearchResult[]> => {
  const term = normalizeSearchTerm(query ?? "");
  if (!term) {
    return [];
  }

  let builder = supabase
    .from("profiles" as any)
    .select("id,user_id,full_name,username,updated_at")
    .order("updated_at", { ascending: false }) as QueryBuilder;

  builder = applyTextFilters(builder, term, ["full_name", "username"]);

  const rows = await execute<any>(builder.limit(limit), "Unable to search people.");
  return rows.map(mapPersonRow);
};

type SearchTeamMembersParams = {
  query: string;
  projectId: string;
  limit: number;
};

const searchTeamMembers = async ({
  query,
  projectId,
  limit,
}: SearchTeamMembersParams): Promise<SearchResult[]> => {
  const term = normalizeSearchTerm(query ?? "");
  if (!term || !projectId) {
    return [];
  }

  let builder = supabase
    .from("project_members_with_profiles" as any)
    .select("user_id,project_id,full_name")
    .eq("project_id", projectId) as QueryBuilder;

  const sanitized = escapeLikePattern(term);
  builder = builder.ilike("full_name", `%${sanitized}%`);

  const rows = await execute<any>(builder.limit(limit), "Unable to search team members.");
  return rows.map(mapTeamMemberRow);
};

type SearchAllParams = {
  q: string;
  projectId?: string;
  limit?: number;
  types?: Array<SearchResult["type"]>;
  includeComments?: boolean;
};

export const searchAll = async ({
  q,
  projectId,
  limit = DEFAULT_LIMIT,
  types,
  includeComments = true,
}: SearchAllParams): Promise<SearchResult[]> => {
  const term = normalizeSearchTerm(q ?? "");
  if (!term) {
    return [];
  }

  const requestedTypes = new Set(types && types.length ? types : ALL_TYPES);
  if (!includeComments) {
    requestedTypes.delete("comment");
  }

  if (requestedTypes.size === 0) {
    return [];
  }

  const activeTypes = Array.from(requestedTypes);
  const perTypeLimit = Math.max(1, Math.ceil(limit / activeTypes.length));

  const promises = activeTypes.map((type) => {
    switch (type) {
      case "task":
        return searchTasks({ query: term, projectId, limit: perTypeLimit });
      case "project":
        return searchProjects({ query: term, limit: perTypeLimit });
      case "doc":
        return searchDocs({ query: term, projectId, limit: perTypeLimit });
      case "file":
        return searchFiles({ query: term, projectId, limit: perTypeLimit });
      case "comment":
        return includeComments
          ? searchComments({ query: term, projectId, limit: perTypeLimit })
          : Promise.resolve<SearchResult[]>([]);
      case "person":
        return searchPeople({ query: term, limit: perTypeLimit });
      case "team_member":
        return projectId
          ? searchTeamMembers({ query: term, projectId, limit: perTypeLimit })
          : Promise.resolve<SearchResult[]>([]);
      default:
        return Promise.resolve<SearchResult[]>([]);
    }
  });

  const results = (await Promise.all(promises)).flat();

  const sorted = results.sort((a, b) => {
    if (typeof a.score === "number" && typeof b.score === "number") {
      return b.score - a.score;
    }
    if (typeof a.score === "number") return -1;
    if (typeof b.score === "number") return 1;

    const aTime = a.updated_at ? Date.parse(a.updated_at) : 0;
    const bTime = b.updated_at ? Date.parse(b.updated_at) : 0;
    return bTime - aTime;
  });

  return sorted.slice(0, limit);
};

type SearchSuggestParams = {
  query: string;
  projectId?: string;
  types?: Array<SearchResult["type"]>;
  limit?: number;
};

export const searchSuggest = async ({
  query,
  projectId,
  types,
  limit = SUGGEST_LIMIT,
}: SearchSuggestParams): Promise<SearchResult[]> => {
  return searchAll({ q: query, projectId, types, limit });
};

export const globalSearch = async (
  query: string,
  options: Omit<SearchAllParams, "q"> = {}
): Promise<SearchResult[]> => {
  return searchAll({ q: query, ...options });
};

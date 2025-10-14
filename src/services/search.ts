// @ts-nocheck
import { compileJql, isLikelyJql } from "@/lib/opql/jqlCompiler";
import { getOpqlSuggestions } from "@/server/search/suggest";
import { createSearchRouter, type OpqlValidationResult, type SavedSearchRecord, type SearchAlertRecord } from "@/server/search/routes";
import type { PrincipalContext } from "@/server/search/queryEngine";
import type { CrossReferenceSuggestion, OpqlSuggestionRequest, OpqlSuggestionResponse, RichTextIndexFields, SearchResult } from "@/types";
import { recordOpqlResponse } from "@/services/offline";

const router = createSearchRouter();

const DEFAULT_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 2_000;
const ALL_TYPES: ReadonlyArray<SearchResult["type"]> = [
  "task",
  "project",
  "doc",
  "file",
  "comment",
  "person",
  "team_member",
];

const CLIENT_PRINCIPAL: PrincipalContext = {
  principalId: "user-demo",
  workspaceId: "workspace-demo",
  roles: ["member"],
  permissions: [
    "search.execute",
    "search.saved.read",
    "search.saved.manage",
    "search.alerts.manage",
    "search.comments.read",
    "search.mask.snippet",
    "docs.view.sensitive",
  ],
};

export class SearchAbuseError extends Error {
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "SearchAbuseError";
    this.retryAfter = retryAfter;
  }
}

export interface SearchExecutionOptions {
  query: string;
  types?: SearchResult["type"][];
  limit?: number;
  cursor?: string;
  timeoutMs?: number;
  explain?: boolean;
}

export interface SearchExecutionResult {
  items: SearchResult[];
  nextCursor?: string;
  partial: boolean;
  metrics: {
    totalMs: number;
    timeout?: boolean;
  };
  explain?: SearchExplain;
}

export interface SearchExplain {
  plan: string[];
  appliedFilters: string[];
  pagination: { limit: number; nextCursor?: string };
  tokenizedQuery: string[];
  historyScans: unknown[];
  datePolicies: string[];
}

const hashTerm = (term: string) => {
  let hash = 0;
  for (let index = 0; index < term.length; index += 1) {
    hash = (hash * 33 + term.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

function coerceRichText(payload: unknown): RichTextIndexFields | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const source = payload as Record<string, unknown>;
  const get = (keys: string[]): string | null | undefined => {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string") {
        return value;
      }
      if (value === null) {
        return null;
      }
    }
    return undefined;
  };
  const fields: RichTextIndexFields = {
    descriptionHtml: get(["descriptionHtml", "description_html", "descriptionHTML"]),
    descriptionText: get(["descriptionText", "description_text", "descriptionPlain"]),
    commentHtml: get(["commentHtml", "comment_html", "commentHTML"]),
    commentText: get(["commentText", "comment_text", "commentPlain"]),
    docHtml: get(["docHtml", "doc_html", "docHTML", "contentHtml", "content_html"]),
    docText: get(["docText", "doc_text", "docPlain", "contentText", "content_text"]),
  };

  return Object.values(fields).some((value) => value != null) ? fields : null;
}

function maskResults(results: SearchResult[]): SearchResult[] {
  return results.map((result) => router.getMaskedResult(result, CLIENT_PRINCIPAL.workspaceId));
}

async function executeStream(options: SearchExecutionOptions): Promise<SearchExecutionResult> {
  const query = options.query.trim();
  if (!query) {
    return {
      items: [],
      nextCursor: undefined,
      partial: false,
      metrics: { totalMs: 0 },
    };
  }

  const types = options.types?.length ? options.types : ALL_TYPES;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let opql: string | undefined;
  if (isLikelyJql(query)) {
    const compiled = compileJql(query);
    opql = compiled.opql;
  }

  const execution = router.streamSearch({
    workspaceId: CLIENT_PRINCIPAL.workspaceId,
    principal: CLIENT_PRINCIPAL,
    query: opql ? undefined : query,
    opql,
    types,
    limit,
    cursor: options.cursor,
    timeoutMs,
    explain: options.explain,
  });

  const collected: SearchResult[] = [];
  let nextCursor: string | undefined;
  let partial = false;
  let metrics: SearchExecutionResult["metrics"] = { totalMs: 0 };
  let explain: SearchExplain | undefined;

  try {
    for await (const chunk of execution) {
      collected.push(...maskResults(chunk.items));
      nextCursor = chunk.nextCursor;
      partial = chunk.partial;
      metrics = { totalMs: chunk.metrics.totalMs, timeout: chunk.metrics.timeout };
      if (chunk.explain) {
        explain = chunk.explain;
      }
    }
  } catch (error) {
    if (error instanceof Error && "retryAfter" in error) {
      throw new SearchAbuseError(error.message, (error as { retryAfter: number }).retryAfter);
    }
    throw error;
  }

  return {
    items: collected,
    nextCursor,
    partial,
    metrics,
    explain,
  };
}

export async function searchAll({
  q,
  projectId,
  limit = DEFAULT_LIMIT,
  types,
  includeComments = true,
  cursor,
  timeoutMs,
  explain,
}: {
  q: string;
  projectId?: string;
  limit?: number;
  types?: SearchResult["type"][];
  includeComments?: boolean;
  cursor?: string;
  timeoutMs?: number;
  explain?: boolean;
}): Promise<SearchExecutionResult> {
  const requested = new Set(types?.length ? types : ALL_TYPES);
  if (!includeComments) {
    requested.delete("comment");
  }
  if (projectId) {
    requested.add("project");
  }
  const result = await executeStream({
    query: q,
    types: Array.from(requested),
    limit,
    cursor,
    timeoutMs,
    explain,
  });

  if (projectId) {
    result.items = result.items.map((item) =>
      item.project_id && item.project_id !== projectId
        ? { ...item, snippet: `${item.snippet ?? ""} (cross-project)` }
        : item,
    );
  }

  result.items = result.items.map((item) => {
    const normalizedRichText = coerceRichText((item as Record<string, unknown>).richText ?? (item as Record<string, unknown>).rich_text);
    if (!normalizedRichText) return item;
    return { ...item, richText: normalizedRichText } satisfies SearchResult;
  });

  if (q.trim()) {
    const hashed = hashTerm(q.trim().toLowerCase());
    console.debug?.("search:query", { hash: hashed, partial: result.partial, timeout: result.metrics.timeout });
  }

  if (typeof window !== "undefined") {
    void recordOpqlResponse({
      query: q,
      projectId: projectId ?? null,
      types: Array.from(requested),
      items: result.items,
      partial: result.partial,
      nextCursor: result.nextCursor ?? null,
    }).catch((error) => console.debug?.("offline-index:record-opql", error));
  }

  return result;
}

const CROSS_REFERENCE_TYPES: ReadonlySet<SearchResult["type"]> = new Set(["task", "project", "doc", "file", "comment"]);

export async function searchCrossReferences({
  query,
  projectId,
  limit = 12,
  types,
  includeComments = true,
}: {
  query: string;
  projectId?: string;
  limit?: number;
  types?: SearchResult["type"][];
  includeComments?: boolean;
}): Promise<CrossReferenceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const allowedTypes = types?.length ? types.filter((type) => CROSS_REFERENCE_TYPES.has(type)) : undefined;
  const { items } = await searchAll({
    q: trimmed,
    projectId,
    limit,
    types: allowedTypes,
    includeComments,
  });

  return items
    .filter((item) => CROSS_REFERENCE_TYPES.has(item.type))
    .map((item) => {
      const richText = (item as Record<string, unknown>).richText as RichTextIndexFields | undefined;
      const subtitle =
        richText?.descriptionText ??
        richText?.commentText ??
        richText?.docText ??
        item.snippet ??
        item.description ??
        undefined;
      return {
        id: item.id,
        type: item.type as CrossReferenceSuggestion["type"],
        title: item.title ?? item.id,
        subtitle: subtitle ?? undefined,
        url: item.url,
      } satisfies CrossReferenceSuggestion;
    });
}

export async function searchTasks({ query, limit, cursor, timeoutMs }: { query: string; limit?: number; cursor?: string; timeoutMs?: number }) {
  const { items, nextCursor, partial, metrics } = await executeStream({
    query,
    types: ["task"],
    limit,
    cursor,
    timeoutMs,
  });
  return { items, nextCursor, partial, metrics };
}

export async function searchProjects({ query, limit, cursor, timeoutMs }: { query: string; limit?: number; cursor?: string; timeoutMs?: number }) {
  const { items, nextCursor, partial, metrics } = await executeStream({
    query,
    types: ["project"],
    limit,
    cursor,
    timeoutMs,
  });
  return { items, nextCursor, partial, metrics };
}

export async function searchSuggest({ query, limit = 6, types }: { query: string; limit?: number; types?: SearchResult["type"][] }) {
  return executeStream({ query, limit, types }).then((result) => ({ ...result, items: result.items.slice(0, limit) }));
}

export const opqlSuggest = async (request: OpqlSuggestionRequest): Promise<OpqlSuggestionResponse> => {
  return getOpqlSuggestions(request);
};

export function validateOpql(opql: string): OpqlValidationResult {
  return router.validateOpql({
    workspaceId: CLIENT_PRINCIPAL.workspaceId,
    principal: CLIENT_PRINCIPAL,
    opql,
  });
}

export function listSavedSearches(): SavedSearchRecord[] {
  return router.listSavedSearches({ workspaceId: CLIENT_PRINCIPAL.workspaceId, principal: CLIENT_PRINCIPAL });
}

export function upsertSavedSearch(payload: Partial<SavedSearchRecord> & { id?: string }): SavedSearchRecord {
  return router.upsertSavedSearch({
    workspaceId: CLIENT_PRINCIPAL.workspaceId,
    principal: CLIENT_PRINCIPAL,
    payload,
  });
}

export function deleteSavedSearch(id: string): void {
  router.deleteSavedSearch({ workspaceId: CLIENT_PRINCIPAL.workspaceId, principal: CLIENT_PRINCIPAL, id });
}

export function listSearchAlerts(): SearchAlertRecord[] {
  return router.listAlerts({ workspaceId: CLIENT_PRINCIPAL.workspaceId, principal: CLIENT_PRINCIPAL });
}

export function upsertSearchAlert(payload: Partial<SearchAlertRecord> & { id?: string }): SearchAlertRecord {
  return router.upsertAlert({ workspaceId: CLIENT_PRINCIPAL.workspaceId, principal: CLIENT_PRINCIPAL, payload });
}

export function deleteSearchAlert(id: string): void {
  router.deleteAlert({ workspaceId: CLIENT_PRINCIPAL.workspaceId, principal: CLIENT_PRINCIPAL, id });
}

export function getSearchDiagnostics() {
  return router.getDiagnostics(CLIENT_PRINCIPAL.workspaceId);
}

export function getSearchAuditLog() {
  return router.getAuditLog(CLIENT_PRINCIPAL.workspaceId);
}

export async function globalSearch(query: string, options: Omit<Parameters<typeof searchAll>[0], "q"> = {}) {
  return searchAll({ q: query, ...options });
}

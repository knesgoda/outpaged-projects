// @ts-nocheck
import { searchEngine, toSearchResult } from "./engineRegistry";
import type { PrincipalContext, QueryRequest } from "./engineRegistry";
import {
  opqlQueryStore,
  type QueryDialect,
  type QueryParameterMetadata,
  type SavedSearchRecord,
  type SavedSearchScope,
  type SavedSearchValidationSnapshot,
} from "./queryStore";
import type { SearchResult } from "@/types";

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `search-${Math.random().toString(16).slice(2)}-${Date.now()}`;
};

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

const DEFAULT_WINDOW_MS = 10_000;
const DEFAULT_MAX_REQUESTS = 8;
const DEFAULT_PAGE_SIZE = 25;

type SavedSearchUpsertPayload = Partial<
  Omit<
    SavedSearchRecord,
    | "workspaceId"
    | "createdAt"
    | "updatedAt"
    | "audit"
    | "scope"
    | "validation"
    | "parameters"
    | "filters"
    | "maskedFields"
    | "opql"
    | "originalQuery"
    | "dialect"
  >
> &
  Partial<{
    scope: Partial<SavedSearchScope>;
    validation: Partial<SavedSearchValidationSnapshot>;
    parameters: QueryParameterMetadata[];
    filters: Record<string, unknown>;
    maskedFields: string[];
    opql: string;
    originalQuery: string;
    dialect: QueryDialect;
    sharedWith: string[];
  }> & { id?: string };

export type SearchPermission =
  | "search.execute"
  | "search.saved.read"
  | "search.saved.manage"
  | "search.alerts.manage";

export interface SearchStreamRequest {
  workspaceId: string;
  principal: PrincipalContext;
  query?: string;
  opql?: string;
  limit?: number;
  cursor?: string;
  timeoutMs?: number;
  explain?: boolean;
  chunkSize?: number;
  types?: SearchResult["type"][];
}

export interface SearchStreamChunk {
  items: SearchResult[];
  nextCursor?: string;
  partial?: boolean;
  metrics: {
    totalMs: number;
    deadline: number;
    timeout?: boolean;
    stages: Array<{ name: string; duration: number }>;
  };
  explain?: {
    plan: string[];
    appliedFilters: string[];
    pagination: { limit: number; nextCursor?: string };
    tokenizedQuery: string[];
    historyScans: unknown[];
    datePolicies: string[];
  };
}

export interface OpqlValidationSuccess {
  valid: true;
  caret?: undefined;
  position?: undefined;
  error?: undefined;
}

export interface OpqlValidationFailure {
  valid: false;
  error: string;
  position: number;
  caret: string;
}

export type OpqlValidationResult = OpqlValidationSuccess | OpqlValidationFailure;

export interface SearchAlertRecord {
  id: string;
  workspaceId: string;
  savedSearchId: string;
  frequency: "immediate" | "daily" | "weekly";
  channels: ("email" | "slack" | "webhook")[];
  muted: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchDiagnosticsSnapshot {
  indexFreshnessMinutes: number;
  ingestionLagMs: number;
  failureCount: number;
  hottestQueries: Array<{ hash: string; sample?: string; count: number; lastRunAt: string }>;
  abuseSignals: {
    throttledRequests: number;
    blockedPrincipals: string[];
    lastThrottleAt?: string;
  };
}

interface SearchLogEntry {
  id: string;
  workspaceId: string;
  principalId: string;
  at: string;
  hashedQuery: string;
  sampleQuery?: string;
  types: SearchResult["type"][];
  durationMs: number;
  partial: boolean;
  timeout: boolean;
  explainRequested: boolean;
}

export interface SearchRouterOptions {
  engine?: typeof searchEngine;
  rateLimit?: { windowMs: number; maxRequests: number };
  pageSize?: number;
}

class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export class RateLimitError extends Error {
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly counters = new Map<string, { count: number; resetAt: number }>();

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  consume(key: string) {
    const now = Date.now();
    const entry = this.counters.get(key);
    if (!entry || entry.resetAt < now) {
      this.counters.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }

    if (entry.count >= this.limit) {
      const retryAfter = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
      throw new RateLimitError("Rate limit exceeded", retryAfter);
    }

    entry.count += 1;
  }
}

function hashQuery(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function normaliseQuery(input: string | undefined): string {
  return (input ?? "").trim();
}

function looksLikeOpql(input: string | undefined): boolean {
  if (!input) return false;
  return /^(FIND|COUNT|AGGREGATE|UPDATE|EXPLAIN)\b/i.test(input.trim());
}

function detectDialect(query: string): QueryDialect {
  return looksLikeOpql(query) ? "opql" : "jql";
}

function caretForPosition(input: string, position: number): string {
  const safePosition = Math.max(0, Math.min(position, input.length));
  return `${input}\n${" ".repeat(safePosition)}^`;
}

function extractTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}

function normalizeParameters(input: unknown): QueryParameterMetadata[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const token = typeof record.token === "string" ? record.token.trim() : "";
      if (!token) {
        return null;
      }
      const label =
        typeof record.label === "string" && record.label.trim()
          ? record.label.trim()
          : token;
      const type = typeof record.type === "string" ? record.type : undefined;
      const description =
        typeof record.description === "string" ? record.description : undefined;
      const required =
        typeof record.required === "boolean" ? (record.required as boolean) : undefined;
      const defaultValueCandidate = (record as { defaultValue?: unknown }).defaultValue;
      const defaultValue =
        typeof defaultValueCandidate === "string" ||
        typeof defaultValueCandidate === "number" ||
        typeof defaultValueCandidate === "boolean" ||
        defaultValueCandidate === null
          ? (defaultValueCandidate as string | number | boolean | null)
          : undefined;

      return {
        token,
        label,
        type,
        description,
        required,
        defaultValue,
      } satisfies QueryParameterMetadata;
    })
    .filter((entry): entry is QueryParameterMetadata => Boolean(entry));
}

function normalizeScope(
  candidate: Partial<SavedSearchScope> | undefined,
  fallbackVisibility: SavedSearchScope["visibility"],
  fallbackOwner: string,
  sharedWith?: unknown,
): SavedSearchScope {
  const scope: SavedSearchScope = {
    visibility: candidate?.visibility ?? fallbackVisibility,
    ownerId: candidate?.ownerId ?? fallbackOwner,
    sharedWith: [],
  };

  const providedShared = candidate?.sharedWith ?? sharedWith;
  if (Array.isArray(providedShared)) {
    scope.sharedWith = providedShared
      .filter((value): value is string => typeof value === "string" && Boolean(value))
      .map((value) => value.trim());
  }

  return scope;
}

function normalizeFilters(filters: unknown): Record<string, unknown> {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return {};
  }
  return { ...(filters as Record<string, unknown>) };
}

function normalizeMaskedFields(masked: unknown): string[] {
  if (!Array.isArray(masked)) {
    return [];
  }
  return masked
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => value.trim());
}

function applySecurityMask(result: SearchResult, maskedFields: string[]): SearchResult {
  if (!maskedFields.length) {
    return result;
  }

  const clone: SearchResult = { ...result };
  if (maskedFields.includes("snippet")) {
    clone.snippet = "*** masked ***";
  }
  if (maskedFields.includes("title")) {
    clone.title = "Masked record";
  }
  return clone;
}

export class SearchRouter {
  private readonly engine: typeof searchEngine;
  private readonly rateLimiter: RateLimiter;
  private readonly maxPageSize: number;
  private readonly alerts = new Map<string, Map<string, SearchAlertRecord>>();
  private readonly logs: SearchLogEntry[] = [];
  private throttledCount = 0;
  private lastThrottleAt?: string;
  private readonly blockedPrincipals = new Set<string>();
  constructor(options: SearchRouterOptions = {}) {
    this.engine = options.engine ?? searchEngine;
    const windowMs = options.rateLimit?.windowMs ?? DEFAULT_WINDOW_MS;
    const maxRequests = options.rateLimit?.maxRequests ?? DEFAULT_MAX_REQUESTS;
    this.rateLimiter = new RateLimiter(maxRequests, windowMs);
    this.maxPageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

    this.seedDefaults();
  }

  private seedDefaults() {
    const workspaceId = "workspace-demo";
    const savedFilters = opqlQueryStore.listFilters(workspaceId);
    const primary = savedFilters[0];
    if (!primary) {
      return;
    }

    const sampleAlert: SearchAlertRecord = {
      id: generateId(),
      workspaceId,
      savedSearchId: primary.id,
      frequency: "daily",
      channels: ["email", "slack"],
      muted: false,
      lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      createdAt: primary.createdAt,
      updatedAt: primary.updatedAt,
    };

    this.alerts.set(workspaceId, new Map([[sampleAlert.id, sampleAlert]]));
  }

  async *streamSearch(request: SearchStreamRequest): AsyncGenerator<SearchStreamChunk> {
    this.assertPermission(request.principal, "search.execute");

    const rateKey = `${request.principal.principalId}:${request.workspaceId}`;
    try {
      this.rateLimiter.consume(rateKey);
    } catch (error) {
      if (error instanceof RateLimitError) {
        this.throttledCount += 1;
        this.lastThrottleAt = new Date().toISOString();
        if (this.throttledCount > DEFAULT_MAX_REQUESTS * 4) {
          this.blockedPrincipals.add(request.principal.principalId);
        }
      }
      throw error;
    }

    if (this.blockedPrincipals.has(request.principal.principalId)) {
      throw new RateLimitError("Principal temporarily blocked due to repeated abuse", 60);
    }

    const queryText = normaliseQuery(request.opql ?? request.query);
    const tokens = extractTokens(queryText);
    const limit = Math.min(this.maxPageSize, Math.max(1, request.limit ?? this.maxPageSize));
    const chunkSize = Math.min(limit, Math.max(1, request.chunkSize ?? Math.min(10, limit)));
    const timeoutMs = request.timeoutMs ?? 2000;
    const deadline = nowMs() + timeoutMs;

    const engineRequest: QueryRequest = {
      workspaceId: request.workspaceId,
      principal: request.principal,
      limit,
      cursor: request.cursor,
      types: request.types,
      explain: request.explain,
    };

    const trimmedOpql = request.opql?.trim();
    const trimmedQuery = request.query?.trim();
    if (trimmedOpql) {
      engineRequest.opql = trimmedOpql;
    } else if (looksLikeOpql(trimmedQuery)) {
      engineRequest.opql = trimmedQuery;
    } else {
      engineRequest.query = trimmedQuery ?? "";
    }

    const execution = await this.engine.execute(engineRequest);
    const normalizedItems = execution.rows.map((row) =>
      this.getMaskedResult(toSearchResult(row), request.workspaceId)
    );

    const metrics: SearchStreamChunk["metrics"] = {
      totalMs: execution.metrics.totalMs,
      deadline,
      timeout: undefined,
      stages: execution.metrics.stages,
    };

    for (let index = 0; index < normalizedItems.length; index += chunkSize) {
      const slice = normalizedItems.slice(index, index + chunkSize);
      const isFinal = index + chunkSize >= normalizedItems.length;
      const nextCursor = isFinal ? execution.nextCursor : undefined;
      const explain = request.explain
        ? {
            plan: execution.plan,
            appliedFilters: execution.appliedFilters,
            pagination: { limit, nextCursor },
            tokenizedQuery: tokens,
            historyScans: execution.historyScans ?? [],
            datePolicies: execution.datePolicies,
          }
        : undefined;
      const partial = isFinal ? Boolean(execution.nextCursor) : true;
      yield {
        items: slice,
        nextCursor,
        partial,
        metrics,
        explain,
      } satisfies SearchStreamChunk;
    }

    const logEntry: SearchLogEntry = {
      id: generateId(),
      workspaceId: request.workspaceId,
      principalId: request.principal.principalId,
      at: new Date().toISOString(),
      hashedQuery: hashQuery(queryText.toLowerCase()),
      sampleQuery: tokens.length ? tokens.join(" ") : undefined,
      types: request.types ?? [],
      durationMs: execution.metrics.totalMs,
      partial: Boolean(execution.nextCursor),
      timeout: Boolean(metrics.timeout),
      explainRequested: Boolean(request.explain),
    };
    this.logs.push(logEntry);
  }

  validateOpql(request: { workspaceId: string; principal: PrincipalContext; opql: string }): OpqlValidationResult {
    this.assertPermission(request.principal, "search.execute");

    const query = normaliseQuery(request.opql);
    if (!query) {
      return { valid: false, error: "Query cannot be empty", position: 0, caret: "^" } satisfies OpqlValidationFailure;
    }

    if (!looksLikeOpql(query)) {
      const stack: string[] = [];
      for (let index = 0; index < query.length; index += 1) {
        const char = query[index]!;
        if (char === "(") {
          stack.push(char);
        } else if (char === ")") {
          if (!stack.length) {
            return {
              valid: false,
              error: "Unmatched closing parenthesis",
              position: index,
              caret: caretForPosition(query, index),
            } satisfies OpqlValidationFailure;
          }
          stack.pop();
        }
      }
      if (stack.length) {
        const position = query.lastIndexOf("(");
        return {
          valid: false,
          error: "Unmatched opening parenthesis",
          position,
          caret: caretForPosition(query, position),
        } satisfies OpqlValidationFailure;
      }
      return { valid: true } satisfies OpqlValidationSuccess;
    }

    const validation = this.engine.validate(query);
    if (validation.valid) {
      return { valid: true } satisfies OpqlValidationSuccess;
    }

    return {
      valid: false,
      error: validation.error ?? "Invalid OPQL statement",
      position: 0,
      caret: caretForPosition(query, 0),
    } satisfies OpqlValidationFailure;
  }

  listSavedSearches(request: { workspaceId: string; principal: PrincipalContext }): SavedSearchRecord[] {
    this.assertPermission(request.principal, "search.saved.read");
    return opqlQueryStore.listFilters(request.workspaceId);
  }

  upsertSavedSearch(request: {
    workspaceId: string;
    principal: PrincipalContext;
    payload: SavedSearchUpsertPayload;
  }): SavedSearchRecord {
    this.assertPermission(request.principal, "search.saved.manage");
    const now = new Date().toISOString();
    const existing = request.payload.id
      ? opqlQueryStore.getFilter(request.workspaceId, request.payload.id)
      : undefined;

    const visibility = request.payload.visibility ?? existing?.visibility ?? "private";
    const originalQuery = normaliseQuery(
      request.payload.originalQuery ?? request.payload.opql ?? existing?.originalQuery ?? "",
    );
    const canonical = normaliseQuery(request.payload.opql ?? existing?.opql ?? originalQuery);
    const dialect: QueryDialect = request.payload.dialect ?? detectDialect(originalQuery);
    const scope = normalizeScope(
      request.payload.scope,
      visibility,
      request.payload.ownerId ?? existing?.ownerId ?? request.principal.principalId,
      request.payload.sharedWith ?? existing?.scope.sharedWith,
    );
    const parameters = normalizeParameters(request.payload.parameters ?? existing?.parameters ?? []);
    const filters = normalizeFilters(request.payload.filters ?? existing?.filters ?? {});
    const maskedFields = normalizeMaskedFields(
      request.payload.maskedFields ?? existing?.maskedFields ?? [],
    );

    const validationResult = this.engine.validate(canonical);
    const validation: SavedSearchValidationSnapshot = validationResult.valid
      ? {
          status: "valid",
          checkedAt: now,
          normalizedOpql: canonical,
        }
      : {
          status: "invalid",
          checkedAt: now,
          normalizedOpql: canonical,
          errors: [validationResult.error ?? "Invalid query"],
          caret: validationResult.caret,
          position: validationResult.position,
        };

    return opqlQueryStore.saveFilter({
      id: request.payload.id,
      workspaceId: request.workspaceId,
      name: request.payload.name ?? existing?.name ?? "Untitled saved search",
      opql: canonical,
      originalQuery,
      dialect,
      parameters,
      scope,
      validation,
      filters,
      visibility,
      ownerId: scope.ownerId,
      description: request.payload.description ?? existing?.description ?? null,
      maskedFields,
      audit: existing?.audit,
    });
  }

  deleteSavedSearch(request: { workspaceId: string; principal: PrincipalContext; id: string }): void {
    this.assertPermission(request.principal, "search.saved.manage");
    opqlQueryStore.deleteFilter(request.workspaceId, request.id);
  }

  listAlerts(request: { workspaceId: string; principal: PrincipalContext }): SearchAlertRecord[] {
    this.assertPermission(request.principal, "search.alerts.manage");
    return Array.from(this.alerts.get(request.workspaceId)?.values() ?? []);
  }

  upsertAlert(request: {
    workspaceId: string;
    principal: PrincipalContext;
    payload: Partial<Omit<SearchAlertRecord, "workspaceId" | "createdAt" | "updatedAt" | "id">> & { id?: string };
  }): SearchAlertRecord {
    this.assertPermission(request.principal, "search.alerts.manage");
    const store = this.ensureAlertStore(request.workspaceId);
    const now = new Date().toISOString();

    if (request.payload.id && store.has(request.payload.id)) {
      const existing = store.get(request.payload.id)!;
      const next: SearchAlertRecord = {
        ...existing,
        ...request.payload,
        updatedAt: now,
      };
      store.set(next.id, next);
      return next;
    }

    if (!request.payload.savedSearchId) {
      throw new Error("savedSearchId is required when creating an alert");
    }

    const id = request.payload.id ?? generateId();
    const next: SearchAlertRecord = {
      id,
      workspaceId: request.workspaceId,
      savedSearchId: request.payload.savedSearchId,
      frequency: request.payload.frequency ?? "daily",
      channels: request.payload.channels ?? ["email"],
      muted: request.payload.muted ?? false,
      lastTriggeredAt: request.payload.lastTriggeredAt,
      createdAt: now,
      updatedAt: now,
    };
    store.set(id, next);
    return next;
  }

  deleteAlert(request: { workspaceId: string; principal: PrincipalContext; id: string }): void {
    this.assertPermission(request.principal, "search.alerts.manage");
    this.ensureAlertStore(request.workspaceId).delete(request.id);
  }

  getDiagnostics(workspaceId: string): SearchDiagnosticsSnapshot {
    const repository = this.engine.getRepository();
    const rows = repository.snapshot ? repository.snapshot(workspaceId) : [];
    const newest = rows.reduce((acc, row) => {
      const updated = typeof row.values.updated_at === "string" ? row.values.updated_at : acc;
      return acc > updated ? acc : updated;
    }, "1970-01-01T00:00:00.000Z");
    const lagMs = rows.length
      ? rows
          .map((row) => {
            const timestamp = typeof row.values.updated_at === "string" ? Date.parse(row.values.updated_at) : Date.now();
            return Math.max(0, Date.now() - timestamp);
          })
          .reduce((acc, value) => acc + value, 0) / rows.length
      : 0;

    const grouped = new Map<string, { count: number; lastRunAt: string; sample?: string }>();
    for (const entry of this.logs.filter((log) => log.workspaceId === workspaceId)) {
      const bucket = grouped.get(entry.hashedQuery) ?? { count: 0, lastRunAt: entry.at, sample: entry.sampleQuery };
      bucket.count += 1;
      if (new Date(entry.at).getTime() > new Date(bucket.lastRunAt).getTime()) {
        bucket.lastRunAt = entry.at;
      }
      bucket.sample ??= entry.sampleQuery;
      grouped.set(entry.hashedQuery, bucket);
    }

    const hottestQueries = Array.from(grouped.entries())
      .map(([hash, info]) => ({ hash, count: info.count, lastRunAt: info.lastRunAt, sample: info.sample }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      indexFreshnessMinutes: Math.round(Math.max(0, (Date.now() - new Date(newest).getTime()) / 1000 / 60)),
      ingestionLagMs: Math.round(lagMs),
      failureCount: 0,
      hottestQueries,
      abuseSignals: {
        throttledRequests: this.throttledCount,
        blockedPrincipals: Array.from(this.blockedPrincipals),
        lastThrottleAt: this.lastThrottleAt,
      },
    } satisfies SearchDiagnosticsSnapshot;
  }

  getAuditLog(workspaceId: string): SearchLogEntry[] {
    return this.logs.filter((log) => log.workspaceId === workspaceId);
  }

  getMaskedResult(result: SearchResult, workspaceId: string): SearchResult {
    const maskedFields = new Set(opqlQueryStore.getMaskedFields(workspaceId));
    return applySecurityMask(result, Array.from(maskedFields));
  }

  private ensureAlertStore(workspaceId: string) {
    if (!this.alerts.has(workspaceId)) {
      this.alerts.set(workspaceId, new Map());
    }
    return this.alerts.get(workspaceId)!;
  }

  private assertPermission(principal: PrincipalContext, permission: SearchPermission) {
    if (principal.allowAll) return;
    if (principal.permissions?.includes(permission)) return;
    throw new PermissionError(`Missing permission: ${permission}`);
  }
}

export function createSearchRouter(options?: SearchRouterOptions) {
  return new SearchRouter(options);
}

export type { SearchLogEntry };
export type { SavedSearchRecord } from "./queryStore";

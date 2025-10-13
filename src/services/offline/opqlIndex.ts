import type {
  SearchResult,
  SearchResultAssignee,
  SearchResultHistory,
} from "@/types";
import {
  parseOPQL,
  type ComparisonOperator,
  type Expression,
  type FindStatement,
  type HistoryPredicateExpression,
  type Statement,
} from "@/lib/opql/parser";

const DEFAULT_SOURCE = "items";

const DB_NAME = "outpaged-offline-opql";
const DB_VERSION = 2;
const ENTITY_STORE = "entities";
const QUERY_STORE = "queries";
const OFFLINE_CURSOR_PREFIX = "offset:";

const TOKEN_REGEX = /[\p{L}\p{N}]+/gu;
const TEXTUAL_OPERATORS = new Set(["MATCH", "LIKE", "CONTAINS", "=", "~", "!~"]);

const TEXTUAL_FALLBACK_PATTERN = /\b[\p{L}\p{N}_.]+\s+(CONTAINS|MATCH|LIKE|~|!~)\s+(["'])(.*?)\2/giu;

type EntityStoreName = typeof ENTITY_STORE;
type QueryStoreName = typeof QUERY_STORE;
type StoreName = EntityStoreName | QueryStoreName;

type OfflineFacetIndex = {
  labels: string[];
  assignees: string[];
  status?: string | null;
};

type OfflineEntity = {
  id: string;
  type: SearchResult["type"];
  title: string;
  snippet?: string | null;
  url: string;
  projectId?: string | null;
  updatedAt?: string | null;
  score?: number;
  tokens: string[];
  tokenBag: Record<string, number>;
  docLength: number;
  numericUpdatedAt?: number | null;
  indexedAt: number;
  labels?: string[] | null;
  assignees?: SearchResultAssignee[] | null;
  status?: string | null;
  history?: SearchResultHistory | null;
  permissions?: SearchResult["permissions"] | null;
  facetIndex: OfflineFacetIndex;
};

type OfflineQueryRecord = {
  key: string;
  query: OfflineQueryKey;
  entityIds: string[];
  partial: boolean;
  nextCursor?: string | null;
  timestamp: number;
};

export interface OfflineQueryKey {
  text: string;
  projectId?: string | null;
  types?: SearchResult["type"][] | null;
}

export interface OfflineQueryFilters {
  projectId?: string | null;
  types?: SearchResult["type"][];
  updatedAfter?: number;
  updatedBefore?: number;
  labels?: string[];
  excludeLabels?: string[];
  assignees?: string[];
  excludeAssignees?: string[];
  statuses?: string[];
  excludeStatuses?: string[];
}

export interface HistoryFilterPlan {
  field: string;
  verb: "WAS" | "CHANGED";
  negated: boolean;
  comparison?: {
    operator: ComparisonOperator;
    values: string[];
  };
  qualifiers: {
    actor?: string[];
    before?: number;
    after?: number;
    during?: { start?: number; end?: number };
    to?: { operator: ComparisonOperator; values: string[] };
    from?: { operator: ComparisonOperator; values: string[] };
  };
}

export interface OfflineQueryPlan {
  terms: string[];
  filters: OfflineQueryFilters;
  history: HistoryFilterPlan[];
  unsupported: string[];
}

export interface OfflineQueryResult {
  items: SearchResult[];
  supported: boolean;
  reason?: string;
  plan: OfflineQueryPlan;
  nextCursor?: string | null;
  partial?: boolean;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function ensureArrayUnique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function ensureSourceClause(query: string): string {
  const trimmed = query.trim();
  if (!trimmed.length) return trimmed;
  const statementMatch = /^(FIND|COUNT|AGGREGATE)\b/i.exec(trimmed);
  if (!statementMatch) return trimmed;

  const upper = trimmed.toUpperCase();
  if (upper.includes(" FROM ")) return trimmed;

  const clauseKeywords = [
    " WHERE ",
    " GROUP ",
    " HAVING ",
    " ORDER ",
    " LIMIT ",
    " OFFSET ",
    " CURSOR ",
    " STABLE ",
    " JOIN ",
    " RELATE ",
  ];

  let insertIndex = trimmed.length;
  for (const keyword of clauseKeywords) {
    const idx = upper.indexOf(keyword);
    if (idx !== -1 && idx < insertIndex) {
      insertIndex = idx;
    }
  }

  const before = trimmed.slice(0, insertIndex);
  const after = trimmed.slice(insertIndex);
  const needsPrefixSpace = before.endsWith(" ") || before.length === 0 ? "" : " ";
  const needsSuffixSpace = after.length === 0 || after.startsWith(" ") ? "" : " ";
  return `${before}${needsPrefixSpace}FROM ${DEFAULT_SOURCE}${needsSuffixSpace}${after}`.trim();
}

function extractFallbackTerms(query: string): string[] {
  const terms: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = TEXTUAL_FALLBACK_PATTERN.exec(query)) !== null) {
    const phrase = match[3];
    if (phrase) {
      terms.push(...tokenize(phrase));
    }
  }
  return ensureArrayUnique(terms);
}

function ensureIndex(store: IDBObjectStore, name: string, keyPath: string, options?: IDBIndexParameters) {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options);
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error("IndexedDB unavailable in this environment"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open offline OPQL index"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      let entityStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(ENTITY_STORE)) {
        entityStore = db.createObjectStore(ENTITY_STORE, { keyPath: "id" });
      } else {
        entityStore = request.transaction!.objectStore(ENTITY_STORE);
      }
      ensureIndex(entityStore, "type", "type", { unique: false });
      ensureIndex(entityStore, "projectId", "projectId", { unique: false });
      ensureIndex(entityStore, "token", "tokens", { unique: false, multiEntry: true });
      ensureIndex(entityStore, "updatedAt", "numericUpdatedAt", { unique: false });
      ensureIndex(entityStore, "label", "facetIndex.labels", { unique: false, multiEntry: true });
      ensureIndex(entityStore, "assignee", "facetIndex.assignees", { unique: false, multiEntry: true });
      ensureIndex(entityStore, "status", "facetIndex.status", { unique: false });

      if (!db.objectStoreNames.contains(QUERY_STORE)) {
        db.createObjectStore(QUERY_STORE, { keyPath: "key" });
      }
    };
  });
  return dbPromise;
}

async function withStore<R>(storeName: StoreName | StoreName[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => Promise<R>): Promise<R> {
  const db = await openDatabase();
  const stores = Array.isArray(storeName) ? storeName : [storeName];
  const tx = db.transaction(stores, mode);
  const result = await fn(tx);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
  return result;
}

function tokenize(value: string | null | undefined): string[] {
  if (!value) return [];
  return ensureArrayUnique(
    (value.match(TOKEN_REGEX) ?? [])
      .map((segment) => segment.toLowerCase())
      .filter((segment) => segment.length > 1),
  );
}

function tokenizeAll(value: string | null | undefined): string[] {
  if (!value) return [];
  return (value.match(TOKEN_REGEX) ?? [])
    .map((segment) => segment.toLowerCase())
    .filter((segment) => segment.length > 1);
}

function normalizeFacetValue(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

function buildAssigneeIndex(assignees: SearchResultAssignee[] | null | undefined): string[] {
  if (!assignees?.length) return [];
  const values: string[] = [];
  for (const assignee of assignees) {
    if (!assignee) continue;
    if (assignee.id) {
      const normalized = normalizeFacetValue(assignee.id);
      if (normalized) values.push(normalized);
    }
    if (assignee.name) {
      const normalized = normalizeFacetValue(assignee.name);
      if (normalized) values.push(normalized);
    }
    if (assignee.email) {
      const normalized = normalizeFacetValue(assignee.email);
      if (normalized) values.push(normalized);
    }
  }
  return ensureArrayUnique(values);
}

function buildLabelIndex(labels: string[] | null | undefined): string[] {
  if (!labels?.length) return [];
  const normalized = labels
    .map((label) => normalizeFacetValue(label))
    .filter((value): value is string => Boolean(value));
  return ensureArrayUnique(normalized);
}

function cloneHistorySnapshot(history: SearchResultHistory | null | undefined): SearchResultHistory | null {
  if (!history) return null;
  const segments: Record<string, SearchResultHistory["segments"][string]> = {};
  for (const [field, list] of Object.entries(history.segments ?? {})) {
    const key = field.toLowerCase();
    segments[key] = list.map((segment) => ({
      field: segment.field?.toLowerCase?.() ?? key,
      value: segment.value,
      start: segment.start ?? null,
      end: segment.end ?? null,
      actor: segment.actor ?? null,
      changedAt: segment.changedAt ?? segment.end ?? segment.start ?? null,
    }));
  }
  const events = (history.events ?? []).map((event) => ({
    at: event.at,
    actor: event.actor ?? null,
    changes: event.changes.map((change) => ({
      field: change.field.toLowerCase(),
      from: change.from,
      to: change.to,
    })),
  }));
  return { events, segments } satisfies SearchResultHistory;
}

function collectTokenStatistics(result: SearchResult) {
  const bag = new Map<string, number>();
  const push = (value: string | null | undefined) => {
    for (const token of tokenizeAll(value)) {
      bag.set(token, (bag.get(token) ?? 0) + 1);
    }
  };

  push(result.title);
  push(result.snippet ?? undefined);
  push(result.status ?? undefined);
  if (Array.isArray(result.labels)) {
    for (const label of result.labels) {
      push(label);
    }
  }
  if (Array.isArray(result.assignees)) {
    for (const assignee of result.assignees) {
      push(assignee?.name ?? undefined);
      push(assignee?.email ?? undefined);
      push(assignee?.id ?? undefined);
    }
  }

  const tokens = Array.from(bag.keys());
  const tokenBag = Object.fromEntries(bag);
  const docLength = Array.from(bag.values()).reduce((acc, count) => acc + count, 0);
  return { tokens, tokenBag, docLength };
}

function parseDateToEpoch(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toEntity(result: SearchResult): OfflineEntity {
  const { tokens, tokenBag, docLength } = collectTokenStatistics(result);
  const labels = Array.isArray(result.labels)
    ? result.labels.filter((value): value is string => typeof value === "string")
    : null;
  const assignees = Array.isArray(result.assignees)
    ? result.assignees
        .filter((value): value is SearchResultAssignee => Boolean(value) && typeof value.id === "string")
        .map((assignee) => ({
          id: assignee.id,
          name: assignee.name ?? null,
          email: assignee.email ?? null,
        }))
    : null;
  const status = typeof result.status === "string" ? result.status : null;
  const history = cloneHistorySnapshot(result.history ?? undefined);
  const permissions = result.permissions ? JSON.parse(JSON.stringify(result.permissions)) : null;

  return {
    id: result.id,
    type: result.type,
    title: result.title,
    snippet: result.snippet,
    url: result.url,
    projectId: result.project_id ?? null,
    updatedAt: result.updated_at ?? null,
    numericUpdatedAt: parseDateToEpoch(result.updated_at ?? null),
    score: result.score,
    tokens,
    tokenBag,
    docLength,
    indexedAt: Date.now(),
    labels,
    assignees,
    status,
    history,
    permissions,
    facetIndex: {
      labels: buildLabelIndex(labels),
      assignees: buildAssigneeIndex(assignees),
      status: normalizeFacetValue(status),
    },
  } satisfies OfflineEntity;
}

export function normalizeQueryKey(key: OfflineQueryKey): string {
  const normalizedTypes = key.types?.length ? ensureArrayUnique([...key.types]).sort() : null;
  const trimmed = key.text.trim().toLowerCase();
  return [
    `q=${trimmed}`,
    `project=${key.projectId ?? ""}`,
    `types=${normalizedTypes?.join(",") ?? ""}`,
  ].join("|");
}

async function writeEntities(items: SearchResult[]): Promise<string[]> {
  if (!items.length) return [];
  return withStore(ENTITY_STORE, "readwrite", async (tx) => {
    const store = tx.objectStore(ENTITY_STORE);
    const ids: string[] = [];
    await Promise.all(
      items.map(
        (item) =>
          new Promise<void>((resolve, reject) => {
            const entity = toEntity(item);
            const request = store.put(entity);
            request.onsuccess = () => {
              ids.push(entity.id);
              resolve();
            };
            request.onerror = () => reject(request.error ?? new Error("Failed to persist entity"));
          }),
      ),
    );
    return ids;
  });
}

async function readQueryRecord(key: string): Promise<OfflineQueryRecord | null> {
  return withStore(QUERY_STORE, "readonly", async (tx) => {
    const store = tx.objectStore(QUERY_STORE);
    return new Promise<OfflineQueryRecord | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result as OfflineQueryRecord | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Failed to load query record"));
    });
  });
}

export async function recordOpqlResponse({
  query,
  projectId,
  types,
  items,
  partial,
  nextCursor,
}: {
  query: string;
  projectId?: string | null;
  types?: SearchResult["type"][] | null;
  items: SearchResult[];
  partial: boolean;
  nextCursor?: string | null;
}): Promise<void> {
  if (!isBrowser()) return;
  if (!items.length && !partial) return;
  const key = normalizeQueryKey({ text: query, projectId: projectId ?? null, types: types ?? null });
  const entityIds = await writeEntities(items);
  await withStore(QUERY_STORE, "readwrite", async (tx) => {
    const store = tx.objectStore(QUERY_STORE);
    const record: OfflineQueryRecord = {
      key,
      query: { text: query, projectId: projectId ?? null, types: types ?? null },
      entityIds,
      partial,
      nextCursor: nextCursor ?? null,
      timestamp: Date.now(),
    } satisfies OfflineQueryRecord;
    store.put(record);
    return record;
  });
}

export async function clearOfflineIndex(): Promise<void> {
  if (!isBrowser()) return;

  try {
    if (dbPromise) {
      const db = await dbPromise.catch(() => null);
      db?.close();
    }
  } catch (error) {
    console.warn("Failed to close offline index", error);
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to clear offline index"));
  }).catch((error) => {
    console.warn("Failed to delete offline index", error);
  });

  dbPromise = null;
}

function intersectSets(setA: Set<string> | null, setB: Set<string>): Set<string> {
  if (!setA) return new Set(setB);
  const result = new Set<string>();
  for (const value of setA) {
    if (setB.has(value)) {
      result.add(value);
    }
  }
  return result;
}

function unionSets(existing: Set<string> | null, addition: Set<string>): Set<string> {
  const result = new Set(existing ?? []);
  for (const value of addition) {
    result.add(value);
  }
  return result;
}

async function countEntities(): Promise<number> {
  return withStore(ENTITY_STORE, "readonly", async (tx) => {
    const store = tx.objectStore(ENTITY_STORE);
    return new Promise<number>((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(Number(request.result ?? 0));
      request.onerror = () => reject(request.error ?? new Error("Failed to count entities"));
    });
  });
}

async function gatherKeysByIndex(indexName: string, range: IDBKeyRange): Promise<Set<string>> {
  return withStore(ENTITY_STORE, "readonly", async (tx) => {
    const index = tx.objectStore(ENTITY_STORE).index(indexName);
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = index.getAllKeys(range);
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error ?? new Error("Index scan failed"));
    });
    return new Set(keys.map((key) => String(key)));
  });
}

async function readEntitiesByIds(ids: string[]): Promise<Map<string, OfflineEntity>> {
  if (!ids.length) return new Map();
  return withStore(ENTITY_STORE, "readonly", async (tx) => {
    const store = tx.objectStore(ENTITY_STORE);
    const map = new Map<string, OfflineEntity>();
    await Promise.all(
      ids.map(
        (id) =>
          new Promise<void>((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => {
              if (request.result) {
                map.set(id, request.result as OfflineEntity);
              }
              resolve();
            };
            request.onerror = () => reject(request.error ?? new Error("Failed to load entity"));
          }),
      ),
    );
    return map;
  });
}

async function readAllEntities(): Promise<OfflineEntity[]> {
  return withStore(ENTITY_STORE, "readonly", async (tx) => {
    const store = tx.objectStore(ENTITY_STORE);
    return new Promise<OfflineEntity[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as OfflineEntity[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Failed to read entities"));
    });
  });
}

function encodeCursor(offset: number): string {
  return `${OFFLINE_CURSOR_PREFIX}${offset}`;
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  if (!cursor.startsWith(OFFLINE_CURSOR_PREFIX)) return 0;
  const raw = Number(cursor.slice(OFFLINE_CURSOR_PREFIX.length));
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
}

function hasRequiredPermissions(entity: OfflineEntity, permissions: Set<string> | null): boolean {
  if (!permissions) return true;
  const required = entity.permissions?.required;
  if (!required?.length) return true;
  return required.every((perm) => permissions.has(perm));
}

function matchesComparison(values: string[], candidate: string | null, operator: ComparisonOperator): boolean {
  if (candidate === null) {
    return operator === "NOT IN" || operator === "!=";
  }
  if (operator === "=" || operator === "IN") {
    return values.includes(candidate);
  }
  if (operator === "!=" || operator === "NOT IN") {
    return !values.includes(candidate);
  }
  return false;
}

function timestampOf(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function evaluateWasPredicate(history: SearchResultHistory, predicate: HistoryFilterPlan): boolean {
  const segments = history.segments[predicate.field] ?? [];
  const comparisonValues = predicate.comparison?.values ?? [];
  let matched = false;
  for (const segment of segments) {
    const candidate = normalizeFacetValue(String(segment.value ?? ""));
    if (comparisonValues.length && !matchesComparison(comparisonValues, candidate, predicate.comparison!.operator)) {
      continue;
    }
    if (predicate.qualifiers.actor?.length) {
      const actor = normalizeFacetValue(segment.actor ?? undefined);
      if (!actor || !predicate.qualifiers.actor.includes(actor)) {
        continue;
      }
    }
    const start = timestampOf(segment.start);
    const end = timestampOf(segment.end);
    const changed = timestampOf(segment.changedAt);
    if (predicate.qualifiers.after !== undefined) {
      const reference = changed ?? start;
      if (reference === null || reference < predicate.qualifiers.after) {
        continue;
      }
    }
    if (predicate.qualifiers.before !== undefined) {
      const reference = changed ?? end ?? start;
      if (reference === null || reference > predicate.qualifiers.before) {
        continue;
      }
    }
    if (predicate.qualifiers.during) {
      const windowStart = predicate.qualifiers.during.start ?? Number.NEGATIVE_INFINITY;
      const windowEnd = predicate.qualifiers.during.end ?? Number.POSITIVE_INFINITY;
      const segmentStart = start ?? Number.NEGATIVE_INFINITY;
      const segmentEnd = end ?? Number.POSITIVE_INFINITY;
      if (segmentEnd < windowStart || segmentStart > windowEnd) {
        continue;
      }
    }
    matched = true;
    break;
  }
  return predicate.negated ? !matched : matched;
}

function evaluateChangedPredicate(history: SearchResultHistory, predicate: HistoryFilterPlan): boolean {
  const events = history.events ?? [];
  const comparisonValues = predicate.comparison?.values ?? [];
  for (const event of events) {
    const eventTime = Date.parse(event.at);
    if (predicate.qualifiers.after !== undefined && eventTime < predicate.qualifiers.after) {
      continue;
    }
    if (predicate.qualifiers.before !== undefined && eventTime > predicate.qualifiers.before) {
      continue;
    }
    if (predicate.qualifiers.during) {
      const windowStart = predicate.qualifiers.during.start ?? Number.NEGATIVE_INFINITY;
      const windowEnd = predicate.qualifiers.during.end ?? Number.POSITIVE_INFINITY;
      if (eventTime < windowStart || eventTime > windowEnd) {
        continue;
      }
    }
    if (predicate.qualifiers.actor?.length) {
      const actor = normalizeFacetValue(event.actor ?? undefined);
      if (!actor || !predicate.qualifiers.actor.includes(actor)) {
        continue;
      }
    }
    const change = event.changes.find((entry) => entry.field.toLowerCase() === predicate.field);
    if (!change) continue;
    const toValue = normalizeFacetValue(change.to ? String(change.to) : null);
    const fromValue = normalizeFacetValue(change.from ? String(change.from) : null);
    if (predicate.comparison && !matchesComparison(comparisonValues, toValue, predicate.comparison.operator)) {
      continue;
    }
    if (predicate.qualifiers.to) {
      const values = predicate.qualifiers.to.values;
      if (!matchesComparison(values, toValue, predicate.qualifiers.to.operator)) {
        continue;
      }
    }
    if (predicate.qualifiers.from) {
      const values = predicate.qualifiers.from.values;
      if (!matchesComparison(values, fromValue, predicate.qualifiers.from.operator)) {
        continue;
      }
    }
    return predicate.negated ? false : true;
  }
  return predicate.negated ? true : false;
}

function evaluateHistoryPredicate(history: SearchResultHistory, predicate: HistoryFilterPlan): boolean {
  if (predicate.verb === "WAS") {
    return evaluateWasPredicate(history, predicate);
  }
  if (predicate.verb === "CHANGED") {
    return evaluateChangedPredicate(history, predicate);
  }
  return false;
}

function matchesHistoryPredicates(history: SearchResultHistory | null | undefined, predicates: HistoryFilterPlan[]): boolean {
  if (!predicates.length) return true;
  if (!history) {
    return predicates.every((predicate) => predicate.negated);
  }
  return predicates.every((predicate) => evaluateHistoryPredicate(history, predicate));
}

function matchesEntityFilters(
  entity: OfflineEntity,
  plan: OfflineQueryPlan,
  permissionSet: Set<string> | null,
): boolean {
  if (!hasRequiredPermissions(entity, permissionSet)) {
    return false;
  }

  const filters = plan.filters;

  if (filters.projectId && entity.projectId !== filters.projectId) {
    return false;
  }

  if (filters.types?.length && !filters.types.includes(entity.type)) {
    return false;
  }

  if (filters.updatedAfter !== undefined) {
    const value = entity.numericUpdatedAt ?? Number.NEGATIVE_INFINITY;
    if (value < filters.updatedAfter) {
      return false;
    }
  }

  if (filters.updatedBefore !== undefined) {
    const value = entity.numericUpdatedAt ?? Number.POSITIVE_INFINITY;
    if (value > filters.updatedBefore) {
      return false;
    }
  }

  if (filters.labels?.length) {
    if (!entity.facetIndex.labels.some((label) => filters.labels!.includes(label))) {
      return false;
    }
  }

  if (filters.excludeLabels?.length) {
    if (entity.facetIndex.labels.some((label) => filters.excludeLabels!.includes(label))) {
      return false;
    }
  }

  if (filters.assignees?.length) {
    if (!entity.facetIndex.assignees.some((value) => filters.assignees!.includes(value))) {
      return false;
    }
  }

  if (filters.excludeAssignees?.length) {
    if (entity.facetIndex.assignees.some((value) => filters.excludeAssignees!.includes(value))) {
      return false;
    }
  }

  if (filters.statuses?.length) {
    const status = entity.facetIndex.status;
    if (!status || !filters.statuses.includes(status)) {
      return false;
    }
  }

  if (filters.excludeStatuses?.length) {
    const status = entity.facetIndex.status;
    if (status && filters.excludeStatuses.includes(status)) {
      return false;
    }
  }

  if (!matchesHistoryPredicates(entity.history ?? null, plan.history)) {
    return false;
  }

  return true;
}

function literalValue(expr: Expression | undefined): unknown {
  if (!expr) return undefined;
  if (expr.kind === "literal") return expr.value;
  return undefined;
}

function stringValue(expr: Expression | undefined): string | null {
  const value = literalValue(expr);
  return typeof value === "string" ? value : null;
}

function resolveFieldName(expr: Expression | undefined): string | null {
  if (!expr || expr.kind !== "identifier") return null;
  const parts = [expr.name, ...(expr.path ?? [])];
  return parts.join(".").toLowerCase();
}

function extractStringArray(values: Expression[] | undefined): string[] | null {
  if (!values?.length) return null;
  const output: string[] = [];
  for (const option of values) {
    const value = stringValue(option);
    if (!value) return null;
    const normalized = normalizeFacetValue(value);
    if (!normalized) return null;
    output.push(normalized);
  }
  return ensureArrayUnique(output);
}

function extractTemporalValue(expr: Expression | undefined): number | null {
  const literal = literalValue(expr);
  return parseDateToEpoch(typeof literal === "string" || typeof literal === "number" ? literal : null);
}

function pushValue(list: string[] | undefined, value: string): string[] {
  const next = list ? [...list] : [];
  if (!next.includes(value)) {
    next.push(value);
  }
  return next;
}

function parseHistoryPredicate(expression: HistoryPredicateExpression, plan: OfflineQueryPlan) {
  const field = resolveFieldName(expression.field);
  if (!field) {
    plan.unsupported.push("history:unknown-field");
    return;
  }
  const comparisonValues: string[] = [];
  if (expression.comparison) {
    if (expression.comparison.value) {
      const value = normalizeFacetValue(stringValue(expression.comparison.value));
      if (!value) {
        plan.unsupported.push("history:comparison");
        return;
      }
      comparisonValues.push(value);
    }
    if (expression.comparison.values) {
      const values = extractStringArray(expression.comparison.values);
      if (!values) {
        plan.unsupported.push("history:comparison");
        return;
      }
      comparisonValues.push(...values);
    }
  }
  const qualifiers: HistoryFilterPlan["qualifiers"] = {};
  for (const qualifier of expression.qualifiers) {
    if (qualifier.type === "BY") {
      const actor = normalizeFacetValue(stringValue(qualifier.value));
      if (!actor) {
        plan.unsupported.push("history:actor");
        return;
      }
      qualifiers.actor = pushValue(qualifiers.actor, actor);
    } else if (qualifier.type === "AFTER") {
      const timestamp = extractTemporalValue(qualifier.value);
      if (timestamp === null) {
        plan.unsupported.push("history:after");
        return;
      }
      qualifiers.after = timestamp;
    } else if (qualifier.type === "BEFORE") {
      const timestamp = extractTemporalValue(qualifier.value);
      if (timestamp === null) {
        plan.unsupported.push("history:before");
        return;
      }
      qualifiers.before = timestamp;
    } else if (qualifier.type === "DURING") {
      const start = extractTemporalValue(qualifier.start);
      const end = extractTemporalValue(qualifier.end);
      if (start === null && end === null) {
        plan.unsupported.push("history:during");
        return;
      }
      qualifiers.during = { start: start ?? undefined, end: end ?? undefined };
    } else if (qualifier.type === "TO") {
      const values = qualifier.values ? extractStringArray(qualifier.values) : null;
      const single = qualifier.value ? normalizeFacetValue(stringValue(qualifier.value)) : null;
      const merged = values ?? (single ? [single] : null);
      if (!merged) {
        plan.unsupported.push("history:to");
        return;
      }
      qualifiers.to = { operator: qualifier.operator, values: merged };
    } else if (qualifier.type === "FROM") {
      const values = qualifier.values ? extractStringArray(qualifier.values) : null;
      const single = qualifier.value ? normalizeFacetValue(stringValue(qualifier.value)) : null;
      const merged = values ?? (single ? [single] : null);
      if (!merged) {
        plan.unsupported.push("history:from");
        return;
      }
      qualifiers.from = { operator: qualifier.operator, values: merged };
    }
  }
  const comparison = expression.comparison && comparisonValues.length
    ? { operator: expression.comparison.operator, values: ensureArrayUnique(comparisonValues) }
    : undefined;
  plan.history.push({ field, verb: expression.verb, negated: Boolean(expression.negated), comparison, qualifiers });
}

function applyBinaryExpression(expression: Expression & { kind: "binary" }, plan: OfflineQueryPlan) {
  const field = resolveFieldName(expression.left);
  if (!field) {
    plan.unsupported.push("unknown-field-expression");
    return;
  }
  const operator = expression.operator;
  const rhs = expression.right;

  if (field === "type") {
    const value = normalizeFacetValue(stringValue(rhs));
    if (operator === "=" && value) {
      plan.filters.types = pushValue(plan.filters.types, value as SearchResult["type"]);
      return;
    }
    if ((operator === "IN" || operator === "NOT IN") && rhs?.kind === "in") {
      const values = extractStringArray(rhs.options);
      if (values) {
        if (operator === "IN") {
          plan.filters.types = ensureArrayUnique([...(plan.filters.types ?? []), ...(values as SearchResult["type"][])]);
        } else {
          plan.unsupported.push("type:not-in");
        }
        return;
      }
    }
  }

  if (field === "project" || field === "project.id" || field === "project_id") {
    const value = normalizeFacetValue(stringValue(rhs));
    if (operator === "=" && value) {
      plan.filters.projectId = value;
      return;
    }
  }

  if (field === "updated" || field === "updated_at") {
    const literal = literalValue(rhs);
    const timestamp = parseDateToEpoch(literal as string | number | null | undefined);
    if (timestamp !== null) {
      if (operator === ">" || operator === ">=" || operator === "AFTER") {
        plan.filters.updatedAfter = Math.max(plan.filters.updatedAfter ?? Number.NEGATIVE_INFINITY, timestamp);
        return;
      }
      if (operator === "<" || operator === "<=" || operator === "BEFORE") {
        plan.filters.updatedBefore = Math.min(plan.filters.updatedBefore ?? Number.POSITIVE_INFINITY, timestamp);
        return;
      }
      if (operator === "=" || operator === "ON") {
        plan.filters.updatedAfter = Math.max(plan.filters.updatedAfter ?? Number.NEGATIVE_INFINITY, timestamp);
        plan.filters.updatedBefore = Math.min(plan.filters.updatedBefore ?? Number.POSITIVE_INFINITY, timestamp);
        return;
      }
    }
    plan.unsupported.push(`${field} ${operator}`);
    return;
  }

  if (field === "labels" || field === "label") {
    const handleValues = (values: string[] | null, target: "labels" | "excludeLabels") => {
      if (!values?.length) {
        plan.unsupported.push("labels:values");
        return;
      }
      for (const value of values) {
        if (target === "labels") {
          plan.filters.labels = pushValue(plan.filters.labels, value);
        } else {
          plan.filters.excludeLabels = pushValue(plan.filters.excludeLabels, value);
        }
      }
    };
    if (operator === "=") {
      const value = normalizeFacetValue(stringValue(rhs));
      handleValues(value ? [value] : null, "labels");
      return;
    }
    if (operator === "!=") {
      const value = normalizeFacetValue(stringValue(rhs));
      handleValues(value ? [value] : null, "excludeLabels");
      return;
    }
    if ((operator === "IN" || operator === "NOT IN") && rhs?.kind === "in") {
      const values = extractStringArray(rhs.options);
      handleValues(values, operator === "IN" ? "labels" : "excludeLabels");
      return;
    }
  }

  if (field === "assignee" || field === "assignees" || field === "owner") {
    const handleValues = (values: string[] | null, target: "assignees" | "excludeAssignees") => {
      if (!values?.length) {
        plan.unsupported.push("assignee:values");
        return;
      }
      for (const value of values) {
        if (target === "assignees") {
          plan.filters.assignees = pushValue(plan.filters.assignees, value);
        } else {
          plan.filters.excludeAssignees = pushValue(plan.filters.excludeAssignees, value);
        }
      }
    };
    if (operator === "=") {
      const value = normalizeFacetValue(stringValue(rhs));
      handleValues(value ? [value] : null, "assignees");
      return;
    }
    if (operator === "!=") {
      const value = normalizeFacetValue(stringValue(rhs));
      handleValues(value ? [value] : null, "excludeAssignees");
      return;
    }
    if ((operator === "IN" || operator === "NOT IN") && rhs?.kind === "in") {
      const values = extractStringArray(rhs.options);
      handleValues(values, operator === "IN" ? "assignees" : "excludeAssignees");
      return;
    }
  }

  if (field === "status" || field === "state") {
    if ((operator === "IN" || operator === "NOT IN") && rhs?.kind === "in") {
      const values = extractStringArray(rhs.options);
      if (!values) {
        plan.unsupported.push("status:values");
        return;
      }
      if (operator === "IN") {
        for (const val of values) {
          plan.filters.statuses = pushValue(plan.filters.statuses, val);
        }
      } else {
        for (const val of values) {
          plan.filters.excludeStatuses = pushValue(plan.filters.excludeStatuses, val);
        }
      }
      return;
    }
    const value = normalizeFacetValue(stringValue(rhs));
    if (!value) {
      plan.unsupported.push("status:value");
      return;
    }
    if (operator === "=") {
      plan.filters.statuses = pushValue(plan.filters.statuses, value);
      return;
    }
    if (operator === "!=") {
      plan.filters.excludeStatuses = pushValue(plan.filters.excludeStatuses, value);
      return;
    }
  }

  if (TEXTUAL_OPERATORS.has(operator as string) && typeof rhs !== "undefined") {
    const value = stringValue(rhs);
    if (value) {
      plan.terms = ensureArrayUnique([...plan.terms, ...tokenize(value)]);
      return;
    }
  }

  if (operator === "IN" && rhs?.kind === "in") {
    const values = rhs.options.map(literalValue).filter((value): value is string => typeof value === "string");
    if (values.length) {
      plan.terms = ensureArrayUnique([...plan.terms, ...tokenize(values.join(" "))]);
      return;
    }
  }

  plan.unsupported.push(`${field} ${operator}`);
}

function applyExpression(expression: Expression | undefined, plan: OfflineQueryPlan) {
  if (!expression) return;
  if (expression.kind === "binary") {
    if (expression.operator === "AND") {
      applyExpression(expression.left, plan);
      applyExpression(expression.right, plan);
      return;
    }
    if (expression.operator === "OR") {
      plan.unsupported.push("logical:OR");
      return;
    }
    applyBinaryExpression(expression, plan);
    return;
  }
  if (expression.kind === "in") {
    applyBinaryExpression(
      {
        kind: "binary",
        operator: expression.negated ? "NOT IN" : "IN",
        left: expression.value,
        right: expression,
      } as Expression & { kind: "binary" },
      plan,
    );
    return;
  }
  if (expression.kind === "between") {
    plan.unsupported.push(expression.negated ? "between:not" : "between");
    return;
  }
  if (expression.kind === "history") {
    parseHistoryPredicate(expression as HistoryPredicateExpression, plan);
    return;
  }
  if (expression.kind === "unary") {
    plan.unsupported.push(`unary:${expression.operator}`);
    return;
  }
  if (expression.kind === "temporal") {
    plan.unsupported.push(`temporal:${expression.operator}`);
    return;
  }
}

function normalizeFilters(filters: OfflineQueryFilters): OfflineQueryFilters {
  const normalizeList = (values?: string[]) =>
    values?.length ? ensureArrayUnique(values.map((value) => value.toLowerCase())) : undefined;
  filters.labels = normalizeList(filters.labels);
  filters.excludeLabels = normalizeList(filters.excludeLabels);
  filters.assignees = normalizeList(filters.assignees);
  filters.excludeAssignees = normalizeList(filters.excludeAssignees);
  filters.statuses = normalizeList(filters.statuses);
  filters.excludeStatuses = normalizeList(filters.excludeStatuses);
  if (filters.updatedAfter === Number.NEGATIVE_INFINITY) delete filters.updatedAfter;
  if (filters.updatedBefore === Number.POSITIVE_INFINITY) delete filters.updatedBefore;
  return filters;
}

export function planOfflineQuery(query: string, overrides?: Partial<OfflineQueryFilters>): OfflineQueryPlan {
  try {
    const normalizedQuery = ensureSourceClause(query);
    const statement = parseOPQL(normalizedQuery) as Statement;
    const plan: OfflineQueryPlan = {
      terms: [],
      filters: overrides ? { ...overrides } : {},
      history: [],
      unsupported: [],
    };

    if (statement.type === "FIND") {
      applyExpression((statement as FindStatement).where, plan);
      if ((statement as FindStatement).joins?.length) {
        for (const join of (statement as FindStatement).joins ?? []) {
          plan.unsupported.push(`join:${join.alias ?? join.source}`);
        }
      }
      if ((statement as FindStatement).relations?.length) {
        plan.unsupported.push("relations");
      }
    } else if (statement.type === "AGGREGATE") {
      applyExpression((statement as FindStatement).where, plan);
      plan.unsupported.push("statement:aggregate");
      if ((statement as any).groupBy?.length) {
        plan.unsupported.push("aggregate:group_by");
      }
      if ((statement as any).having) {
        plan.unsupported.push("aggregate:having");
      }
    } else {
      if ((statement as any).where) {
        applyExpression((statement as any).where, plan);
      }
      plan.unsupported.push(`statement:${statement.type.toLowerCase()}`);
    }

    if (overrides) {
      plan.filters = { ...plan.filters, ...overrides };
    }

    plan.filters = normalizeFilters(plan.filters);

    const fallbackTerms = extractFallbackTerms(query);
    if (fallbackTerms.length) {
      plan.terms = ensureArrayUnique([...plan.terms, ...fallbackTerms]);
    }

    return plan;
  } catch (error) {
    return {
      terms: tokenize(query),
      filters: overrides ? { ...overrides } : {},
      history: [],
      unsupported: ["parse-error"],
    } satisfies OfflineQueryPlan;
  }
}

function entityToSearchResult(entity: OfflineEntity): SearchResult {
  return {
    id: entity.id,
    type: entity.type,
    title: entity.title,
    snippet: entity.snippet ?? null,
    url: entity.url,
    project_id: entity.projectId ?? null,
    updated_at: entity.updatedAt ?? null,
    score: entity.score,
    labels: entity.labels ?? null,
    assignees: entity.assignees ?? null,
    status: entity.status ?? null,
    history: entity.history ?? null,
    permissions: entity.permissions ?? null,
  } satisfies SearchResult;
}

function computeBm25(
  entity: OfflineEntity,
  terms: string[],
  docFrequency: Map<string, number>,
  totalDocuments: number,
  averageDocLength: number,
): number {
  if (!terms.length) {
    return 0;
  }
  const k1 = 1.5;
  const b = 0.75;
  const length = entity.docLength || 0;
  const scoreComponents: number[] = [];
  for (const term of terms) {
    const tf = entity.tokenBag[term] ?? 0;
    if (tf === 0) continue;
    const df = docFrequency.get(term) ?? 0;
    if (df === 0) continue;
    const idf = Math.log(1 + (totalDocuments - df + 0.5) / (df + 0.5));
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + (b * length) / Math.max(averageDocLength, 1));
    scoreComponents.push(idf * (numerator / denominator));
  }
  return scoreComponents.reduce((acc, value) => acc + value, 0);
}

function rankEntities(
  entities: OfflineEntity[],
  plan: OfflineQueryPlan,
  docFrequency: Map<string, number>,
  totalDocuments: number,
): OfflineEntity[] {
  if (!entities.length) return [];
  const terms = plan.terms.filter((term) => docFrequency.has(term));
  const averageDocLength = entities.reduce((acc, entity) => acc + (entity.docLength || 0), 0) / Math.max(entities.length, 1);

  return [...entities].sort((a, b) => {
    const scoreA = computeBm25(a, terms, docFrequency, totalDocuments, averageDocLength);
    const scoreB = computeBm25(b, terms, docFrequency, totalDocuments, averageDocLength);
    if (Math.abs(scoreB - scoreA) > 1e-6) return scoreB - scoreA;
    const baseA = a.score ?? 0;
    const baseB = b.score ?? 0;
    if (baseA !== baseB) return baseB - baseA;
    const updatedA = a.numericUpdatedAt ?? 0;
    const updatedB = b.numericUpdatedAt ?? 0;
    if (updatedA !== updatedB) return updatedB - updatedA;
    return a.title.localeCompare(b.title);
  });
}

export async function executeOfflineQuery({
  query,
  limit = 20,
  context,
  cursor,
  permissions,
}: {
  query: string;
  limit?: number;
  context?: Partial<OfflineQueryFilters>;
  cursor?: string | null;
  permissions?: string[];
}): Promise<OfflineQueryResult> {
  if (!isBrowser()) {
    return {
      items: [],
      supported: false,
      reason: "unavailable",
      plan: { terms: [], filters: context ?? {}, history: [], unsupported: ["no-browser"] },
      nextCursor: null,
      partial: false,
    } satisfies OfflineQueryResult;
  }

  const plan = planOfflineQuery(query, context);
  const permissionSet = permissions ? new Set(permissions) : null;
  const normalizedKey = normalizeQueryKey({
    text: query,
    projectId: context?.projectId ?? null,
    types: context?.types ?? null,
  });
  const record = await readQueryRecord(normalizedKey);
  let candidateIds: Set<string> | null = record ? new Set(record.entityIds) : null;
  let orderedIds: string[] | null = record ? [...record.entityIds] : null;
  const totalDocuments = await countEntities();
  const docFrequency = new Map<string, number>();
  let textCandidateIds: Set<string> | null = null;

  if (plan.filters.types?.length) {
    const typeSets = await Promise.all(
      plan.filters.types.map((type) => gatherKeysByIndex("type", IDBKeyRange.only(type))),
    );
    const union = typeSets.reduce<Set<string>>((acc, set) => unionSets(acc, set), new Set());
    candidateIds = intersectSets(candidateIds, union);
  }

  if (plan.filters.projectId) {
    const project = await gatherKeysByIndex("projectId", IDBKeyRange.only(plan.filters.projectId));
    candidateIds = intersectSets(candidateIds, project);
  }

  if (plan.filters.labels?.length) {
    const labelSets = await Promise.all(
      plan.filters.labels.map((label) => gatherKeysByIndex("label", IDBKeyRange.only(label))),
    );
    const union = labelSets.reduce<Set<string>>((acc, set) => unionSets(acc, set), new Set());
    candidateIds = intersectSets(candidateIds, union);
  }

  if (plan.filters.assignees?.length) {
    const assigneeSets = await Promise.all(
      plan.filters.assignees.map((value) => gatherKeysByIndex("assignee", IDBKeyRange.only(value))),
    );
    const union = assigneeSets.reduce<Set<string>>((acc, set) => unionSets(acc, set), new Set());
    candidateIds = intersectSets(candidateIds, union);
  }

  if (plan.filters.statuses?.length) {
    const statusSets = await Promise.all(
      plan.filters.statuses.map((value) => gatherKeysByIndex("status", IDBKeyRange.only(value))),
    );
    const union = statusSets.reduce<Set<string>>((acc, set) => unionSets(acc, set), new Set());
    candidateIds = intersectSets(candidateIds, union);
  }

  if (plan.filters.updatedAfter !== undefined) {
    const range = IDBKeyRange.lowerBound(plan.filters.updatedAfter, false);
    const ids = await gatherKeysByIndex("updatedAt", range);
    candidateIds = intersectSets(candidateIds, ids);
  }

  if (plan.filters.updatedBefore !== undefined) {
    const range = IDBKeyRange.upperBound(plan.filters.updatedBefore, false);
    const ids = await gatherKeysByIndex("updatedAt", range);
    candidateIds = intersectSets(candidateIds, ids);
  }

  if (plan.terms.length) {
    for (const term of plan.terms) {
      const ids = await gatherKeysByIndex("token", IDBKeyRange.only(term));
      docFrequency.set(term, ids.size);
      textCandidateIds = unionSets(textCandidateIds, ids);
    }
    if (textCandidateIds) {
      candidateIds = intersectSets(candidateIds, textCandidateIds);
    }
  }

  if (orderedIds && candidateIds) {
    orderedIds = orderedIds.filter((id) => candidateIds!.has(id));
  }

  let entities: OfflineEntity[];
  if (orderedIds) {
    const map = await readEntitiesByIds(orderedIds);
    entities = orderedIds
      .map((id) => map.get(id))
      .filter((entity): entity is OfflineEntity => Boolean(entity));
  } else if (candidateIds) {
    const map = await readEntitiesByIds(Array.from(candidateIds));
    entities = Array.from(map.values());
  } else {
    entities = await readAllEntities();
  }

  const filtered = entities.filter((entity) => matchesEntityFilters(entity, plan, permissionSet));

  let ranked: OfflineEntity[];
  if (orderedIds) {
    ranked = filtered;
  } else {
    ranked = rankEntities(filtered, plan, docFrequency, totalDocuments);
  }

  const offset = decodeCursor(cursor);
  const paged = ranked.slice(offset, offset + limit);
  const nextCursor = offset + limit < ranked.length ? encodeCursor(offset + limit) : null;

  return {
    items: paged.map(entityToSearchResult),
    supported: plan.unsupported.length === 0,
    reason: plan.unsupported.length ? plan.unsupported.join(", ") : undefined,
    plan,
    nextCursor,
    partial: record?.partial ?? false,
  } satisfies OfflineQueryResult;
}

export function isOfflineIndexAvailable(): boolean {
  return isBrowser();
}

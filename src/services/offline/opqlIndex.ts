import type { SearchResult } from "@/types";
import { parseOPQL, type Expression, type FindStatement, type Statement } from "@/lib/opql/parser";

const DB_NAME = "outpaged-offline-opql";
const DB_VERSION = 1;
const ENTITY_STORE = "entities";
const QUERY_STORE = "queries";

type EntityStoreName = typeof ENTITY_STORE;
type QueryStoreName = typeof QUERY_STORE;
type StoreName = EntityStoreName | QueryStoreName;

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
  numericUpdatedAt?: number | null;
  indexedAt: number;
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

export interface OfflineQueryResult {
  items: SearchResult[];
  supported: boolean;
  reason?: string;
  plan: OfflineQueryPlan;
}

export interface OfflineQueryPlan {
  terms: string[];
  filters: {
    projectId?: string | null;
    types?: SearchResult["type"][];
    updatedAfter?: number;
    updatedBefore?: number;
  };
  unsupported: string[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
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
      if (!db.objectStoreNames.contains(ENTITY_STORE)) {
        const store = db.createObjectStore(ENTITY_STORE, { keyPath: "id" });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("projectId", "projectId", { unique: false });
        store.createIndex("token", "tokens", { unique: false, multiEntry: true });
        store.createIndex("updatedAt", "numericUpdatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(QUERY_STORE)) {
        db.createObjectStore(QUERY_STORE, { keyPath: "key" });
      }
    };
  });
  return dbPromise;
}

function ensureArrayUnique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

const TOKEN_REGEX = /[\p{L}\p{N}]+/gu;
const TEXTUAL_OPERATORS = new Set(["MATCH", "LIKE", "CONTAINS", "="]);

function tokenize(value: string | null | undefined): string[] {
  if (!value) return [];
  return ensureArrayUnique(
    (value.match(TOKEN_REGEX) ?? [])
      .map((segment) => segment.toLowerCase())
      .filter((segment) => segment.length > 1)
  );
}

function parseDateToEpoch(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toEntity(result: SearchResult): OfflineEntity {
  const tokens = ensureArrayUnique([
    ...tokenize(result.title),
    ...tokenize(result.snippet ?? undefined),
  ]);
  return {
    id: result.id,
    type: result.type,
    title: result.title,
    snippet: result.snippet,
    url: result.url,
    projectId: result.project_id ?? null,
    updatedAt: result.updated_at ?? null,
    numericUpdatedAt: parseDateToEpoch(result.updated_at ?? undefined),
    score: result.score,
    tokens,
    indexedAt: Date.now(),
  };
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
          })
      )
    );
    return ids;
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
    };
    store.put(record);
    return record;
  });
}

function flattenAndExpressions(expression: Expression | undefined): Expression[] {
  if (!expression) return [];
  if (expression.kind === "binary" && expression.operator === "AND") {
    return [...flattenAndExpressions(expression.left), ...flattenAndExpressions(expression.right)];
  }
  return [expression];
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

function compileWherePlan(statement: FindStatement): OfflineQueryPlan {
  const terms: string[] = [];
  const filters: OfflineQueryPlan["filters"] = {};
  const unsupported: string[] = [];

  for (const clause of flattenAndExpressions(statement.where)) {
    if (clause.kind !== "binary") {
      unsupported.push("non-binary expression");
      continue;
    }
    const field = resolveFieldName(clause.left);
    if (!field) {
      unsupported.push("unknown field expression");
      continue;
    }
    const operator = clause.operator;
    const rhs = clause.right;

    if (field === "type" && operator === "=") {
      const value = stringValue(rhs);
      if (value) {
        filters.types = ensureArrayUnique([...(filters.types ?? []), value as SearchResult["type"]]);
      }
      continue;
    }

    if ((field === "project" || field === "project.id" || field === "project_id") && operator === "=") {
      filters.projectId = stringValue(rhs);
      continue;
    }

    if ((field === "updated_at" || field === "updated")) {
      const literal = rhs && rhs.kind === "literal" ? rhs.value : undefined;
      const timestamp = typeof literal === "string" ? Date.parse(literal) : typeof literal === "number" ? literal : NaN;
      if (Number.isFinite(timestamp)) {
        if (operator === ">" || operator === ">=") {
          filters.updatedAfter = Math.max(filters.updatedAfter ?? Number.NEGATIVE_INFINITY, timestamp);
          continue;
        }
        if (operator === "<" || operator === "<=") {
          filters.updatedBefore = Math.min(filters.updatedBefore ?? Number.POSITIVE_INFINITY, timestamp);
          continue;
        }
      }
    }

    if (TEXTUAL_OPERATORS.has(operator as string) && typeof clause.right !== "undefined") {
      const value = stringValue(rhs);
      if (value) {
        terms.push(...tokenize(value));
        continue;
      }
    }

    if (operator === "IN" && rhs?.kind === "in") {
      const values = rhs.options.map(literalValue).filter((value): value is string => typeof value === "string");
      if (values.length && field === "type") {
        filters.types = ensureArrayUnique([...(filters.types ?? []), ...(values as SearchResult["type"][])]);
        continue;
      }
      if (values.length) {
        terms.push(...tokenize(values.join(" ")));
        continue;
      }
    }

    unsupported.push(`${field} ${operator}`);
  }

  return { terms: ensureArrayUnique(terms), filters, unsupported };
}

export function planOfflineQuery(query: string, overrides?: Partial<OfflineQueryPlan["filters"]>): OfflineQueryPlan {
  try {
    const statement = parseOPQL(query) as Statement;
    if (statement.type !== "FIND") {
      return {
        terms: tokenize(query),
        filters: { ...(overrides ?? {}) },
        unsupported: ["non-find-statement"],
      };
    }
    const plan = compileWherePlan(statement as FindStatement);
    if (overrides) {
      plan.filters = { ...plan.filters, ...overrides };
    }
    if (!plan.terms.length) {
      plan.terms = tokenize(statement.source ?? "");
    }
    return plan;
  } catch (error) {
    return {
      terms: tokenize(query),
      filters: { ...(overrides ?? {}) },
      unsupported: ["parse-error"],
    };
  }
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

async function fetchEntities(ids: Set<string> | null, limit: number): Promise<OfflineEntity[]> {
  return withStore(ENTITY_STORE, "readonly", async (tx) => {
    const store = tx.objectStore(ENTITY_STORE);
    if (!ids) {
      const all = await new Promise<OfflineEntity[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result as OfflineEntity[]) ?? []);
        request.onerror = () => reject(request.error ?? new Error("Failed to read entities"));
      });
      return all.slice(0, limit * 3);
    }
    const list: OfflineEntity[] = [];
    await Promise.all(
      Array.from(ids)
        .slice(0, limit * 5)
        .map(
          (id) =>
            new Promise<void>((resolve, reject) => {
              const request = store.get(id);
              request.onsuccess = () => {
                if (request.result) {
                  list.push(request.result as OfflineEntity);
                }
                resolve();
              };
              request.onerror = () => reject(request.error ?? new Error("Failed to load entity"));
            })
        )
    );
    return list;
  });
}

function rankEntities(entities: OfflineEntity[], terms: string[]): OfflineEntity[] {
  if (!terms.length) {
    return [...entities].sort((a, b) => (b.numericUpdatedAt ?? 0) - (a.numericUpdatedAt ?? 0));
  }
  const termSet = new Set(terms);
  return [...entities].sort((a, b) => {
    const aMatches = a.tokens.filter((token) => termSet.has(token)).length;
    const bMatches = b.tokens.filter((token) => termSet.has(token)).length;
    if (aMatches !== bMatches) return bMatches - aMatches;
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (b.numericUpdatedAt ?? 0) - (a.numericUpdatedAt ?? 0);
  });
}

export async function executeOfflineQuery({
  query,
  limit = 20,
  context,
}: {
  query: string;
  limit?: number;
  context?: Partial<OfflineQueryPlan["filters"]>;
}): Promise<OfflineQueryResult> {
  if (!isBrowser()) {
    return {
      items: [],
      supported: false,
      reason: "unavailable",
      plan: { terms: [], filters: context ?? {}, unsupported: ["no-browser"] },
    };
  }

  const plan = planOfflineQuery(query, context);
  const filters = plan.filters;
  let candidateIds: Set<string> | null = null;

  if (filters.types?.length) {
    const typeIds = await Promise.all(
      filters.types.map((type) => gatherKeysByIndex("type", IDBKeyRange.only(type)))
    );
    const combined = typeIds.reduce<Set<string> | null>((acc, set) => unionSets(acc, set), null);
    if (combined) {
      candidateIds = intersectSets(candidateIds, combined);
    }
  }

  if (filters.projectId) {
    const projectIds = await gatherKeysByIndex("projectId", IDBKeyRange.only(filters.projectId));
    candidateIds = intersectSets(candidateIds, projectIds);
  }

  if (plan.terms.length) {
    for (const term of plan.terms) {
      const ids = await gatherKeysByIndex("token", IDBKeyRange.only(term));
      candidateIds = intersectSets(candidateIds, ids);
      if (candidateIds.size === 0) break;
    }
  }

  if (filters.updatedAfter !== undefined) {
    const range = IDBKeyRange.lowerBound(filters.updatedAfter, true);
    const ids = await gatherKeysByIndex("updatedAt", range);
    candidateIds = intersectSets(candidateIds, ids);
  }

  if (filters.updatedBefore !== undefined) {
    const range = IDBKeyRange.upperBound(filters.updatedBefore, true);
    const ids = await gatherKeysByIndex("updatedAt", range);
    candidateIds = intersectSets(candidateIds, ids);
  }

  const entities = await fetchEntities(candidateIds, limit);
  const ranked = rankEntities(entities, plan.terms).slice(0, limit);

  return {
    items: ranked.map((entity) => ({
      id: entity.id,
      type: entity.type,
      title: entity.title,
      snippet: entity.snippet,
      url: entity.url,
      project_id: entity.projectId ?? undefined,
      updated_at: entity.updatedAt ?? undefined,
      score: entity.score,
    })),
    supported: plan.unsupported.length === 0,
    reason: plan.unsupported.length ? plan.unsupported.join(", ") : undefined,
    plan,
  };
}

export function isOfflineIndexAvailable(): boolean {
  return isBrowser();
}


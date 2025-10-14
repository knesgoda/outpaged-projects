// @ts-nocheck
import type { BoardViewMode } from "@/types/boards";
import { decryptObject, encryptObject } from "./crypto";
import type { EncryptedPayload } from "./crypto";

type MutationStatus = "pending" | "syncing" | "conflict" | "synced" | "failed";

type SyncPayloadType = "update" | "move" | "create" | "delete";

export type VectorClock = Record<string, number>;

export type ConflictPolicyStrategy =
  | "lww"
  | "set-union"
  | "set-intersection"
  | "numeric-max"
  | "numeric-min"
  | "numeric-sum";

export interface ConflictPolicy {
  strategy: ConflictPolicyStrategy;
  field?: string;
  prefer?: "local" | "remote";
}

export interface OfflineOperationMetadata {
  vectorClock: VectorClock;
  conflictPolicy: ConflictPolicy;
  dependencies: string[];
  batchKey?: string | null;
  attempt: number;
  lastAttemptAt?: number;
}

export interface BoardSyncMutationPayload {
  type: SyncPayloadType;
  field?: string | null;
  from?: string | null;
  to?: string | null;
  changes?: Record<string, unknown>;
  item?: Record<string, unknown>;
}

export interface BoardSyncMutation extends OfflineOperationMetadata {
  id: string;
  boardId: string;
  view: BoardViewMode;
  itemId: string;
  payload: BoardSyncMutationPayload;
  timestamp: number;
  status: MutationStatus;
  baseVersion?: string | number | null;
  conflict?: {
    remote: Record<string, unknown>;
    reason?: string;
  } | null;
}

export interface BoardSnapshot {
  id: string;
  boardId: string;
  view: BoardViewMode;
  items: Record<string, unknown>[];
  updatedAt: number;
}

export interface ItemMutation extends OfflineOperationMetadata {
  id: string;
  itemId: string;
  payload: Record<string, unknown>;
  timestamp: number;
  status: MutationStatus;
}

export interface DocCrdtOperation extends OfflineOperationMetadata {
  id: string;
  docId: string;
  ops: unknown[];
  timestamp: number;
  status: MutationStatus;
}

export interface CommentMutation extends OfflineOperationMetadata {
  id: string;
  commentId: string;
  payload: Record<string, unknown>;
  timestamp: number;
  status: MutationStatus;
}

export interface FileUploadRecord extends OfflineOperationMetadata {
  id: string;
  fileId: string;
  parts: Array<{ partNumber: number; etag?: string }>;
  payload: Record<string, unknown>;
  timestamp: number;
  status: MutationStatus;
}

export interface DependencyGraphRecord {
  id: string;
  dependencies: string[];
  dependents: string[];
  resolved: boolean;
  lastUpdated: number;
}

export interface OperationBatch {
  id: string;
  batchKey: string;
  store: OfflineStoreName;
  operationIds: string[];
  createdAt: number;
  attempt: number;
}

export type SyncOutcome =
  | { kind: "success"; record?: Record<string, unknown> }
  | { kind: "conflict"; remote: Record<string, unknown>; reason?: string }
  | { kind: "skipped" };

type OfflineStoreName =
  | "boardQueue"
  | "itemQueue"
  | "docOps"
  | "commentQueue"
  | "fileQueue"
  | "snapshots"
  | "dependencies"
  | "batches"
  | "profilePreferenceQueue"
  | "profilePreferenceSnapshots"
  | "commentDrafts";

const DB_NAME = "outpaged-board-offline";
const DB_VERSION = 4;
const STORE_CONFIG: Record<OfflineStoreName, { keyPath: string }> = {
  boardQueue: { keyPath: "id" },
  itemQueue: { keyPath: "id" },
  docOps: { keyPath: "id" },
  commentQueue: { keyPath: "id" },
  fileQueue: { keyPath: "id" },
  snapshots: { keyPath: "id" },
  dependencies: { keyPath: "id" },
  batches: { keyPath: "id" },
  profilePreferenceQueue: { keyPath: "id" },
  profilePreferenceSnapshots: { keyPath: "id" },
  commentDrafts: { keyPath: "id" },
};

const memoryStores: Record<OfflineStoreName, Map<string, unknown>> = {
  boardQueue: new Map(),
  itemQueue: new Map(),
  docOps: new Map(),
  commentQueue: new Map(),
  fileQueue: new Map(),
  snapshots: new Map(),
  dependencies: new Map(),
  batches: new Map(),
  profilePreferenceQueue: new Map(),
  profilePreferenceSnapshots: new Map(),
  commentDrafts: new Map(),
};

let dbPromise: Promise<IDBDatabase> | null = null;

const hasIndexedDb = typeof indexedDB !== "undefined";

type EncryptedRecord<T extends { id: string }> = {
  id: string;
  __encrypted__: true;
  payload: EncryptedPayload;
};

type StoredRecord<T extends { id: string }> = T | EncryptedRecord<T>;

let offlinePersistenceEnabled = true;

function getLocalNodeId() {
  if (typeof window === "undefined") {
    return "server";
  }

  const key = "outpaged-offline-node-id";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const id = `node-${window.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return `node-${Math.random().toString(16).slice(2)}`;
  }
}

const localNodeId = getLocalNodeId();

export function getOfflineNodeId() {
  return localNodeId;
}

export function setOfflinePersistenceEnabled(enabled: boolean) {
  offlinePersistenceEnabled = enabled;
}

function now() {
  return Date.now();
}

function ensureVectorClock(clock?: VectorClock | null): VectorClock {
  const next: VectorClock = { ...(clock ?? {}) };
  if (!next[localNodeId]) {
    next[localNodeId] = 0;
  }
  return next;
}

function incrementVectorClock(clock?: VectorClock | null): VectorClock {
  const next = ensureVectorClock(clock);
  next[localNodeId] = (next[localNodeId] ?? 0) + 1;
  return next;
}

function mergeVectorClocks(...clocks: (VectorClock | undefined | null)[]): VectorClock {
  const merged: VectorClock = {};
  for (const clock of clocks) {
    if (!clock) continue;
    for (const [node, value] of Object.entries(clock)) {
      merged[node] = Math.max(merged[node] ?? 0, value);
    }
  }
  return merged;
}

function compareVectorClocks(a?: VectorClock | null, b?: VectorClock | null): "ahead" | "behind" | "equal" | "concurrent" {
  const aClock = a ?? {};
  const bClock = b ?? {};
  let aAhead = false;
  let bAhead = false;

  const nodes = new Set([...Object.keys(aClock), ...Object.keys(bClock)]);
  nodes.forEach((node) => {
    const aValue = aClock[node] ?? 0;
    const bValue = bClock[node] ?? 0;
    if (aValue > bValue) {
      aAhead = true;
    } else if (bValue > aValue) {
      bAhead = true;
    }
  });

  if (aAhead && !bAhead) return "ahead";
  if (!aAhead && bAhead) return "behind";
  if (!aAhead && !bAhead) return "equal";
  return "concurrent";
}

function defaultConflictPolicy(): ConflictPolicy {
  return { strategy: "lww" };
}

function generateId(prefix: string) {
  return `${prefix}-${now()}-${Math.random().toString(16).slice(2)}`;
}

function openDatabase(): Promise<IDBDatabase> {
  if (!hasIndexedDb) {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        for (const [storeName, config] of Object.entries(STORE_CONFIG) as Array<[
          OfflineStoreName,
          (typeof STORE_CONFIG)[OfflineStoreName]
        ]>) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: config.keyPath });
          }
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    });
  }

  return dbPromise;
}

function snapshotKey(boardId: string, view: BoardViewMode) {
  return `${boardId}:${view}`;
}

function toRecord<T>(value: unknown): T | null {
  if (value && typeof value === "object") {
    return value as T;
  }
  return null;
}

function isEncryptedStoredRecord(value: unknown): value is EncryptedRecord<any> {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { __encrypted__?: unknown }).__encrypted__ === true &&
      (value as { payload?: unknown }).payload
  );
}

async function unwrapStoredRecord<T>(value: unknown): Promise<T | null> {
  if (!value) return null;
  if (isEncryptedStoredRecord(value)) {
    const decrypted = await decryptObject<T>((value as EncryptedRecord<T>).payload);
    return decrypted;
  }
  return toRecord<T>(value);
}

async function prepareRecordForStorage<T extends { id: string }>(record: T): Promise<StoredRecord<T>> {
  if (!hasIndexedDb) {
    return record;
  }
  try {
    const payload = await encryptObject(record);
    if (payload) {
      return { id: record.id, __encrypted__: true, payload } satisfies EncryptedRecord<T>;
    }
  } catch (error) {
    console.warn("Failed to encrypt offline record", error);
  }
  return record;
}

async function putRecord<T extends { id: string }>(storeName: OfflineStoreName, record: T): Promise<T> {
  if (!offlinePersistenceEnabled) {
    return record;
  }

  if (!hasIndexedDb) {
    memoryStores[storeName].set(record.id, JSON.parse(JSON.stringify(record)));
    return record;
  }

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    void (async () => {
      try {
        const prepared = await prepareRecordForStorage(record);
        const request = store.put(prepared);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error(`Failed to write ${storeName}`));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(`Failed to write ${storeName}`));
      }
    })();
  });
  return record;
}

async function readRecord<T>(storeName: OfflineStoreName, id: string): Promise<T | null> {
  if (!hasIndexedDb) {
    return toRecord<T>(memoryStores[storeName].get(id) ?? null);
  }

  const db = await openDatabase();
  return new Promise<T | null>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => {
      void (async () => {
        try {
          const result = await unwrapStoredRecord<T>(request.result);
          resolve(result);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(`Failed to read from ${storeName}`));
        }
      })();
    };
    request.onerror = () => reject(request.error ?? new Error(`Failed to read from ${storeName}`));
  });
}

async function readAllRecords<T>(storeName: OfflineStoreName): Promise<T[]> {
  if (!hasIndexedDb) {
    return Array.from(memoryStores[storeName].values()).map((value) => JSON.parse(JSON.stringify(value)) as T);
  }

  const db = await openDatabase();
  return new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => {
      void (async () => {
        try {
          const raw = (request.result as StoredRecord<T>[]) ?? [];
          const values = await Promise.all(raw.map((value) => unwrapStoredRecord<T>(value)));
          resolve(values.filter((value): value is T => Boolean(value)));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(`Failed to list ${storeName}`));
        }
      })();
    };
    request.onerror = () => reject(request.error ?? new Error(`Failed to list ${storeName}`));
  });
}

async function deleteRecord(storeName: OfflineStoreName, id: string): Promise<void> {
  if (!hasIndexedDb) {
    memoryStores[storeName].delete(id);
    return;
  }

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Failed to delete from ${storeName}`));
  });
}

function deriveMetadata(
  metadata?: Partial<OfflineOperationMetadata>
): Pick<OfflineOperationMetadata, "vectorClock" | "conflictPolicy" | "dependencies" | "batchKey" | "attempt" | "lastAttemptAt"> {
  return {
    vectorClock: incrementVectorClock(metadata?.vectorClock),
    conflictPolicy: metadata?.conflictPolicy ?? defaultConflictPolicy(),
    dependencies: metadata?.dependencies ?? [],
    batchKey: metadata?.batchKey ?? null,
    attempt: metadata?.attempt ?? 0,
    lastAttemptAt: metadata?.lastAttemptAt,
  };
}

async function registerDependencies(record: { id: string; dependencies: string[] }) {
  if (!record.dependencies.length) return;

  const entry: DependencyGraphRecord = {
    id: record.id,
    dependencies: [...new Set(record.dependencies)],
    dependents: [],
    resolved: false,
    lastUpdated: now(),
  };

  await putRecord("dependencies", entry);

  for (const dependencyId of entry.dependencies) {
    const dependencyRecord =
      (await readRecord<DependencyGraphRecord>("dependencies", dependencyId)) ?? {
        id: dependencyId,
        dependencies: [],
        dependents: [],
        resolved: false,
        lastUpdated: now(),
      };

    if (!dependencyRecord.dependents.includes(record.id)) {
      dependencyRecord.dependents.push(record.id);
      dependencyRecord.lastUpdated = now();
      await putRecord("dependencies", dependencyRecord);
    }
  }
}

async function markDependencyResolved(id: string) {
  const record = await readRecord<DependencyGraphRecord>("dependencies", id);
  if (!record) {
    await putRecord("dependencies", {
      id,
      dependencies: [],
      dependents: [],
      resolved: true,
      lastUpdated: now(),
    });
    return;
  }

  record.resolved = true;
  record.lastUpdated = now();
  await putRecord("dependencies", record);
}

async function areDependenciesResolved(ids: string[]): Promise<boolean> {
  for (const id of ids) {
    const record = await readRecord<DependencyGraphRecord>("dependencies", id);
    if (!record || !record.resolved) {
      return false;
    }
  }
  return true;
}

function getPolicyFieldValue(source: unknown, field?: string) {
  if (!field) return source;
  if (!source || typeof source !== "object") return undefined;
  return (source as Record<string, unknown>)[field];
}

function applyConflictPolicy(
  mutation: BoardSyncMutation,
  remote: Record<string, unknown>
):
  | { kind: "keep-local" }
  | { kind: "use-remote"; record: Record<string, unknown> }
  | { kind: "merge"; record: Record<string, unknown> }
  | { kind: "manual" } {
  const policy = mutation.conflictPolicy ?? defaultConflictPolicy();
  const localClock = mutation.vectorClock;
  const remoteClock = (remote?.vectorClock as VectorClock | undefined) ?? undefined;
  const localHasClock = localClock && Object.keys(localClock).length > 0;
  const remoteHasClock = remoteClock && Object.keys(remoteClock).length > 0;

  if (!localHasClock || !remoteHasClock) {
    return { kind: "manual" };
  }

  const comparison = compareVectorClocks(localClock, remoteClock);

  if (policy.strategy === "lww") {
    if (comparison === "ahead") {
      return { kind: "keep-local" };
    }
    if (comparison === "behind") {
      return { kind: "use-remote", record: remote };
    }
    if (comparison === "equal") {
      if (policy.prefer === "remote") {
        return { kind: "use-remote", record: remote };
      }
      if (policy.prefer === "local") {
        return { kind: "keep-local" };
      }
      return { kind: "manual" };
    }
    return { kind: "manual" };
  }

  const fieldValue = getPolicyFieldValue(mutation.payload.changes ?? mutation.payload.item, policy.field);
  const remoteValue = getPolicyFieldValue(remote, policy.field);

  if (policy.strategy === "set-union") {
    const localSet = new Set(Array.isArray(fieldValue) ? fieldValue : []);
    const remoteSet = new Set(Array.isArray(remoteValue) ? remoteValue : []);
    for (const value of remoteSet) {
      localSet.add(value);
    }
    return { kind: "merge", record: { ...remote, [policy.field ?? "values"]: Array.from(localSet) } };
  }

  if (policy.strategy === "set-intersection") {
    const localSet = new Set(Array.isArray(fieldValue) ? fieldValue : []);
    const remoteSet = new Set(Array.isArray(remoteValue) ? remoteValue : []);
    const result: unknown[] = [];
    for (const value of localSet) {
      if (remoteSet.has(value)) {
        result.push(value);
      }
    }
    return { kind: "merge", record: { ...remote, [policy.field ?? "values"]: result } };
  }

  if (policy.strategy === "numeric-max" || policy.strategy === "numeric-min" || policy.strategy === "numeric-sum") {
    const localNumber = typeof fieldValue === "number" ? fieldValue : Number(fieldValue ?? 0);
    const remoteNumber = typeof remoteValue === "number" ? remoteValue : Number(remoteValue ?? 0);
    let resolvedValue = localNumber;
    if (policy.strategy === "numeric-max") {
      resolvedValue = Math.max(localNumber, remoteNumber);
    } else if (policy.strategy === "numeric-min") {
      resolvedValue = Math.min(localNumber, remoteNumber);
    } else {
      resolvedValue = localNumber + remoteNumber;
    }
    return { kind: "merge", record: { ...remote, [policy.field ?? "value"]: resolvedValue } };
  }

  return { kind: "manual" };
}

export async function enqueueBoardMutation(
  mutation: Omit<
    BoardSyncMutation,
    "id" | "timestamp" | "status" | "conflict" | keyof OfflineOperationMetadata
  > &
    Partial<OfflineOperationMetadata>
): Promise<BoardSyncMutation> {
  const metadata = deriveMetadata(mutation);
  const record: BoardSyncMutation = {
    ...mutation,
    ...metadata,
    id: mutation.id ?? generateId("mutation"),
    timestamp: now(),
    status: "pending",
    conflict: null,
  } as BoardSyncMutation;

  await registerDependencies(record);
  await putRecord("boardQueue", record);
  return record;
}

export async function listBoardMutations(boardId?: string, view?: BoardViewMode) {
  const records = await readAllRecords<BoardSyncMutation>("boardQueue");
  return records
    .filter((record) => (boardId ? record.boardId === boardId : true) && (!view || record.view === view))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function updateBoardMutation(id: string, patch: Partial<BoardSyncMutation>): Promise<void> {
  const existing = await readRecord<BoardSyncMutation>("boardQueue", id);
  if (!existing) return;
  const next = { ...existing, ...patch } as BoardSyncMutation;
  await putRecord("boardQueue", next);
  if (next.status === "synced" || next.status === "failed") {
    await markDependencyResolved(id);
  }
}

export async function deleteBoardMutation(id: string): Promise<void> {
  await deleteRecord("boardQueue", id);
  await markDependencyResolved(id);
}

export async function clearBoardMutations(boardId: string, view?: BoardViewMode) {
  const records = await listBoardMutations(boardId, view);
  await Promise.all(records.map((record) => deleteBoardMutation(record.id)));
}

async function saveRecordSnapshot(snapshot: BoardSnapshot) {
  await putRecord("snapshots", snapshot);
  return snapshot;
}

export async function saveBoardSnapshot(snapshot: Omit<BoardSnapshot, "id"> & { id?: string }) {
  const record: BoardSnapshot = {
    ...snapshot,
    id: snapshot.id ?? snapshotKey(snapshot.boardId, snapshot.view),
  };
  return saveRecordSnapshot(record);
}

export async function getBoardSnapshot(boardId: string, view: BoardViewMode) {
  return readRecord<BoardSnapshot>("snapshots", snapshotKey(boardId, view));
}

export interface ProcessQueueResult {
  processed: BoardSyncMutation[];
  conflicts: { mutation: BoardSyncMutation; remote: Record<string, unknown>; reason?: string }[];
  appliedRemote: { mutation: BoardSyncMutation; record: Record<string, unknown> }[];
  skipped: BoardSyncMutation[];
}

export type QueueSyncer = (
  mutation: BoardSyncMutation,
  options?: { force?: boolean }
) => Promise<SyncOutcome>;

async function handleConflict(
  mutation: BoardSyncMutation,
  outcome: Extract<SyncOutcome, { kind: "conflict" }>
): Promise<
  | { kind: "resolved"; mode: "local" | "remote" | "merge"; record?: Record<string, unknown> }
  | { kind: "manual" }
> {
  const resolution = applyConflictPolicy(mutation, outcome.remote);
  if (resolution.kind === "keep-local") {
    return { kind: "resolved", mode: "local" };
  }
  if (resolution.kind === "use-remote") {
    return { kind: "resolved", mode: "remote", record: resolution.record };
  }
  if (resolution.kind === "merge") {
    return { kind: "resolved", mode: "merge", record: resolution.record };
  }
  return { kind: "manual" };
}

export async function processBoardMutationQueue(
  boardId: string,
  view: BoardViewMode,
  syncer: QueueSyncer
): Promise<ProcessQueueResult> {
  const pending = await listBoardMutations(boardId, view);
  const processed: BoardSyncMutation[] = [];
  const conflicts: ProcessQueueResult["conflicts"] = [];
  const appliedRemote: ProcessQueueResult["appliedRemote"] = [];
  const skipped: BoardSyncMutation[] = [];

  for (const mutation of pending) {
    if (!(await areDependenciesResolved(mutation.dependencies))) {
      skipped.push(mutation);
      continue;
    }

    if (mutation.status === "conflict" && mutation.conflict) {
      conflicts.push({ mutation, remote: mutation.conflict.remote, reason: mutation.conflict.reason });
      continue;
    }

    await updateBoardMutation(mutation.id, {
      status: "syncing",
      attempt: mutation.attempt + 1,
      lastAttemptAt: now(),
      conflict: null,
    });

    let outcome: SyncOutcome;
    try {
      outcome = await syncer({ ...mutation, status: "syncing" });
    } catch (error) {
      await updateBoardMutation(mutation.id, { status: "pending" });
      throw error;
    }

    if (outcome.kind === "success") {
      await updateBoardMutation(mutation.id, {
        status: "synced",
        vectorClock: mergeVectorClocks(mutation.vectorClock, outcome.record?.vectorClock as VectorClock | undefined),
      });
      await deleteBoardMutation(mutation.id);
      processed.push(mutation);
      continue;
    }

    if (outcome.kind === "conflict") {
      const resolved = await handleConflict(mutation, outcome);
      if (resolved.kind === "resolved") {
        if (resolved.mode === "local") {
          await updateBoardMutation(mutation.id, { status: "synced" });
          await deleteBoardMutation(mutation.id);
          processed.push(mutation);
        } else {
          await updateBoardMutation(mutation.id, { status: "synced" });
          await deleteBoardMutation(mutation.id);
          appliedRemote.push({ mutation, record: resolved.record ?? outcome.remote });
        }
        continue;
      }

      await updateBoardMutation(mutation.id, {
        status: "conflict",
        conflict: { remote: outcome.remote, reason: outcome.reason },
      });
      conflicts.push({ mutation: { ...mutation, conflict: { remote: outcome.remote, reason: outcome.reason } }, remote: outcome.remote, reason: outcome.reason });
      break;
    }

    if (outcome.kind === "skipped") {
      await updateBoardMutation(mutation.id, { status: "pending" });
    }
  }

  return { processed, conflicts, appliedRemote, skipped };
}

export async function resolveBoardConflict(
  mutationId: string,
  resolution: "discard" | "retry",
  remoteReplacement?: Record<string, unknown>
) {
  if (resolution === "discard") {
    await deleteBoardMutation(mutationId);
    if (remoteReplacement) {
      await putRecord("docOps", {
        id: `${mutationId}-remote`,
        docId: remoteReplacement.id ?? mutationId,
        ops: [remoteReplacement],
        timestamp: now(),
        status: "synced",
        vectorClock: ensureVectorClock(remoteReplacement.vectorClock as VectorClock | undefined),
        conflictPolicy: defaultConflictPolicy(),
        dependencies: [],
        batchKey: null,
        attempt: 0,
      } satisfies DocCrdtOperation);
    }
    return;
  }

  if (resolution === "retry") {
    await updateBoardMutation(mutationId, {
      status: "pending",
      conflict: remoteReplacement ? { remote: remoteReplacement } : null,
      attempt: 0,
    });
  }
}

export function isIndexedDbEnabled() {
  return hasIndexedDb;
}

export function groupOperationsByBatch<T extends { batchKey?: string | null; timestamp?: number }>(
  operations: T[]
): Map<string, T[]> {
  const batches = new Map<string, T[]>();
  for (const operation of operations) {
    const key = operation.batchKey ?? "__solo__";
    if (!batches.has(key)) {
      batches.set(key, []);
    }
    batches.get(key)!.push(operation);
  }
  for (const [, value] of batches) {
    value.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }
  return batches;
}

export async function enqueueItemMutation(
  mutation: Omit<ItemMutation, "id" | "timestamp" | "status" | keyof OfflineOperationMetadata> &
    Partial<OfflineOperationMetadata>
) {
  const metadata = deriveMetadata(mutation);
  const record: ItemMutation = {
    ...mutation,
    ...metadata,
    id: mutation.id ?? generateId("item-mutation"),
    timestamp: now(),
    status: "pending",
  } as ItemMutation;
  await registerDependencies(record);
  return putRecord("itemQueue", record);
}

export async function listDocOperations(docId?: string) {
  const all = await readAllRecords<DocCrdtOperation>("docOps");
  return all
    .filter((op) => (docId ? op.docId === docId : true))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function enqueueDocOperation(
  operation: Omit<DocCrdtOperation, "id" | "timestamp" | "status" | keyof OfflineOperationMetadata> &
    Partial<OfflineOperationMetadata>
) {
  const metadata = deriveMetadata(operation);
  const record: DocCrdtOperation = {
    ...operation,
    ...metadata,
    id: operation.id ?? generateId("doc-op"),
    timestamp: now(),
    status: "pending",
  } as DocCrdtOperation;
  await registerDependencies(record);
  return putRecord("docOps", record);
}

export async function updateDocOperation(id: string, patch: Partial<DocCrdtOperation>) {
  const existing = await readRecord<DocCrdtOperation>("docOps", id);
  if (!existing) return;
  await putRecord("docOps", { ...existing, ...patch } as DocCrdtOperation);
}

export async function deleteDocOperation(id: string) {
  await deleteRecord("docOps", id);
  await markDependencyResolved(id);
}

export async function enqueueCommentMutation(
  mutation: Omit<CommentMutation, "id" | "timestamp" | "status" | keyof OfflineOperationMetadata> &
    Partial<OfflineOperationMetadata>
) {
  const metadata = deriveMetadata(mutation);
  const record: CommentMutation = {
    ...mutation,
    ...metadata,
    id: mutation.id ?? generateId("comment-mutation"),
    timestamp: now(),
    status: "pending",
  } as CommentMutation;
  await registerDependencies(record);
  return putRecord("commentQueue", record);
}

export async function enqueueFileUpload(
  upload: Omit<FileUploadRecord, "id" | "timestamp" | "status" | keyof OfflineOperationMetadata> &
    Partial<OfflineOperationMetadata>
) {
  const metadata = deriveMetadata(upload);
  const record: FileUploadRecord = {
    ...upload,
    ...metadata,
    id: upload.id ?? generateId("file-upload"),
    timestamp: now(),
    status: "pending",
  } as FileUploadRecord;
  await registerDependencies(record);
  return putRecord("fileQueue", record);
}

export async function listCommentMutations(commentId?: string) {
  const all = await readAllRecords<CommentMutation>("commentQueue");
  return all
    .filter((mutation) => (commentId ? mutation.commentId === commentId : true))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function listItemMutations(itemId?: string) {
  const all = await readAllRecords<ItemMutation>("itemQueue");
  return all
    .filter((mutation) => (itemId ? mutation.itemId === itemId : true))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export type OfflineOperationSource = "board" | "item" | "doc" | "comment" | "file";

export interface OfflineOperationSummary {
  id: string;
  source: OfflineOperationSource;
  status: MutationStatus;
  timestamp: number;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface OfflineQueueSummary {
  total: number;
  byStatus: Record<MutationStatus, number>;
  latestActivity?: number | null;
  operations: OfflineOperationSummary[];
}

const EMPTY_STATUS_SUMMARY: Record<MutationStatus, number> = {
  pending: 0,
  syncing: 0,
  conflict: 0,
  synced: 0,
  failed: 0,
};

function mergeStatusCounts(
  accumulator: Record<MutationStatus, number>,
  records: Array<{ status: MutationStatus }>
) {
  for (const record of records) {
    accumulator[record.status] = (accumulator[record.status] ?? 0) + 1;
  }
  return accumulator;
}

export async function listOfflineOperations(): Promise<OfflineOperationSummary[]> {
  const [board, items, docs, comments, files] = await Promise.all([
    listBoardMutations(),
    listItemMutations(),
    listDocOperations(),
    listCommentMutations(),
    listFileUploads(),
  ]);

  const summaries: OfflineOperationSummary[] = [];

  for (const record of board) {
    summaries.push({
      id: record.id,
      source: "board",
      status: record.status,
      timestamp: record.lastAttemptAt ?? record.timestamp,
      description: `${record.view} • ${record.payload.type}`,
      metadata: {
        boardId: record.boardId,
        itemId: record.itemId,
        vectorClock: record.vectorClock,
      },
    });
  }

  for (const record of items) {
    summaries.push({
      id: record.id,
      source: "item",
      status: record.status,
      timestamp: record.lastAttemptAt ?? record.timestamp,
      description: `Item ${record.itemId}`,
      metadata: {
        vectorClock: record.vectorClock,
        dependencies: record.dependencies,
      },
    });
  }

  for (const record of docs) {
    summaries.push({
      id: record.id,
      source: "doc",
      status: record.status,
      timestamp: record.lastAttemptAt ?? record.timestamp,
      description: `Doc ${record.docId}`,
    });
  }

  for (const record of comments) {
    summaries.push({
      id: record.id,
      source: "comment",
      status: record.status,
      timestamp: record.lastAttemptAt ?? record.timestamp,
      description: `Comment ${record.commentId}`,
    });
  }

  for (const record of files) {
    summaries.push({
      id: record.id,
      source: "file",
      status: record.status,
      timestamp: record.lastAttemptAt ?? record.timestamp,
      description: `File ${record.fileId}`,
    });
  }

  return summaries.sort((a, b) => a.timestamp - b.timestamp);
}

export async function summarizeOfflineQueue(): Promise<OfflineQueueSummary> {
  const operations = await listOfflineOperations();
  const byStatus = mergeStatusCounts({ ...EMPTY_STATUS_SUMMARY }, operations);
  const latestActivity = operations.length
    ? operations.reduce((latest, operation) => Math.max(latest, operation.timestamp), 0)
    : null;

  return {
    total: operations.length,
    byStatus,
    latestActivity,
    operations,
  } satisfies OfflineQueueSummary;
}

export async function updateCommentMutation(id: string, patch: Partial<CommentMutation>) {
  const existing = await readRecord<CommentMutation>("commentQueue", id);
  if (!existing) return;
  await putRecord("commentQueue", { ...existing, ...patch } as CommentMutation);
}

export async function deleteCommentMutation(id: string) {
  await deleteRecord("commentQueue", id);
  await markDependencyResolved(id);
}

export async function listFileUploads(fileId?: string) {
  const all = await readAllRecords<FileUploadRecord>("fileQueue");
  return all
    .filter((upload) => (fileId ? upload.fileId === fileId : true))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function updateFileUpload(id: string, patch: Partial<FileUploadRecord>) {
  const existing = await readRecord<FileUploadRecord>("fileQueue", id);
  if (!existing) return;
  await putRecord("fileQueue", { ...existing, ...patch } as FileUploadRecord);
}

export async function deleteFileUpload(id: string) {
  await deleteRecord("fileQueue", id);
  await markDependencyResolved(id);
}

const QUEUE_STORES: OfflineStoreName[] = [
  "boardQueue",
  "itemQueue",
  "docOps",
  "commentQueue",
  "fileQueue",
  "profilePreferenceQueue",
];

const OPERATION_SOURCE_TO_STORE: Record<OfflineOperationSource, OfflineStoreName> = {
  board: "boardQueue",
  item: "itemQueue",
  doc: "docOps",
  comment: "commentQueue",
  file: "fileQueue",
};

function resolveTimestamp(record: { timestamp?: number; lastAttemptAt?: number; updatedAt?: number }): number | null {
  if (typeof record.lastAttemptAt === "number") return record.lastAttemptAt;
  if (typeof record.timestamp === "number") return record.timestamp;
  if (typeof record.updatedAt === "number") return record.updatedAt;
  return null;
}

export async function clearOfflineStorage(): Promise<void> {
  for (const store of Object.values(memoryStores)) {
    store.clear();
  }

  if (!hasIndexedDb) {
    return;
  }

  try {
    if (dbPromise) {
      const db = await dbPromise.catch(() => null);
      db?.close();
    }
  } catch (error) {
    console.warn("Failed to close offline database before clearing", error);
  }

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to clear offline database"));
  }).catch((error) => {
    console.warn("Failed to delete offline database", error);
  });

  dbPromise = null;
}

export async function pruneOfflineRetention(retentionMs: number): Promise<void> {
  if (retentionMs <= 0) return;
  const cutoff = Date.now() - retentionMs;

  for (const storeName of QUEUE_STORES) {
    const records = await readAllRecords<{ id: string; timestamp?: number; lastAttemptAt?: number; updatedAt?: number }>(
      storeName
    );
    for (const record of records) {
      const timestamp = resolveTimestamp(record);
      if (timestamp !== null && timestamp < cutoff) {
        await deleteRecord(storeName, record.id);
      }
    }
  }
}

function estimateRecordSize(record: unknown): number {
  try {
    return JSON.stringify(record).length;
  } catch {
    return 0;
  }
}

export async function enforceOfflineCacheBudget(limitBytes: number): Promise<void> {
  if (limitBytes <= 0) return;

  const inventory: Array<{
    store: OfflineStoreName;
    id: string;
    timestamp: number;
    size: number;
  }> = [];

  for (const storeName of QUEUE_STORES) {
    const records = await readAllRecords<
      { id: string; timestamp?: number; lastAttemptAt?: number; updatedAt?: number }
    >(storeName);
    for (const record of records) {
      const timestamp = resolveTimestamp(record) ?? Date.now();
      inventory.push({
        store: storeName,
        id: record.id,
        timestamp,
        size: estimateRecordSize(record),
      });
    }
  }

  let total = inventory.reduce((sum, entry) => sum + entry.size, 0);
  if (total <= limitBytes) return;

  inventory.sort((a, b) => a.timestamp - b.timestamp);
  for (const entry of inventory) {
    if (total <= limitBytes) break;
    await deleteRecord(entry.store, entry.id);
    total -= entry.size;
  }
}

async function resetQueueRecord<T extends { id: string; status: MutationStatus; attempt: number; lastAttemptAt?: number | null } & {
  conflict?: unknown | null;
}>(storeName: OfflineStoreName, id: string) {
  const existing = await readRecord<T>(storeName, id);
  if (!existing) return;
  const next: T = {
    ...existing,
    status: "pending",
    attempt: 0,
    lastAttemptAt: undefined,
  };
  if ("conflict" in next) {
    (next as { conflict?: unknown | null }).conflict = null;
  }
  await putRecord(storeName, next);
}

export async function resetOfflineOperation(id: string, source: OfflineOperationSource): Promise<void> {
  const storeName = OPERATION_SOURCE_TO_STORE[source];
  await resetQueueRecord(storeName, id);
}

export async function registerTimelineDependency(
  dependencyId: string,
  prerequisites: string[]
) {
  await registerDependencies({ id: dependencyId, dependencies: prerequisites });
}

export async function markOperationResolved(operationId: string) {
  await markDependencyResolved(operationId);
}

export function createResumableUploadAdapter(
  uploader: (record: FileUploadRecord) => Promise<SyncOutcome>
) {
  return async function processFileUploads() {
    const uploads = await readAllRecords<FileUploadRecord>("fileQueue");
    for (const upload of uploads) {
      if (!(await areDependenciesResolved(upload.dependencies))) continue;
      await putRecord("fileQueue", { ...upload, status: "syncing", attempt: upload.attempt + 1, lastAttemptAt: now() });
      const outcome = await uploader(upload);
      if (outcome.kind === "success") {
        await deleteRecord("fileQueue", upload.id);
        await markDependencyResolved(upload.id);
      } else if (outcome.kind === "conflict") {
        await putRecord("fileQueue", {
          ...upload,
          status: "conflict",
          attempt: upload.attempt + 1,
        });
      } else {
        await putRecord("fileQueue", { ...upload, status: "pending" });
      }
    }
  };
}

export function createTimelineDependencyAdapter(
  processor: (operation: ItemMutation | DocCrdtOperation) => Promise<void>
) {
  return async function processTimelineQueue() {
    const [items, docs] = await Promise.all([
      readAllRecords<ItemMutation>("itemQueue"),
      readAllRecords<DocCrdtOperation>("docOps"),
    ]);

    const batches = [...items, ...docs]
      .filter((operation) => operation.batchKey)
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const operation of batches) {
      if (!(await areDependenciesResolved(operation.dependencies))) continue;
      await processor(operation as ItemMutation);
      if ("docId" in operation) {
        await deleteRecord("docOps", operation.id);
      } else {
        await deleteRecord("itemQueue", operation.id);
      }
      await markDependencyResolved(operation.id);
    }
  };
}

export interface ProfilePreferenceRecord {
  favorites: string[];
  viewSettings: Record<string, unknown>;
  layoutSelections: Record<string, unknown>;
  updatedAt: string;
}

export interface ProfilePreferenceSnapshot {
  id: string;
  userId: string;
  preferences: ProfilePreferenceRecord;
  updatedAt: number;
}

export interface CommentDraftRecord extends OfflineOperationMetadata {
  id: string;
  threadId: string;
  payload: {
    content: string;
    doc?: Record<string, unknown> | null;
    plaintext?: string;
  };
  updatedAt: number;
}

export interface ProfilePreferenceMutation extends OfflineOperationMetadata {
  id: string;
  userId: string;
  payload: ProfilePreferenceRecord;
  timestamp: number;
  status: MutationStatus;
  conflict?: { remote: ProfilePreferenceRecord; reason?: string } | null;
}

export type ProfilePreferenceSyncer = (
  mutation: ProfilePreferenceMutation,
  options?: { force?: boolean }
) => Promise<SyncOutcome>;

export interface ProcessPreferenceQueueResult {
  processed: ProfilePreferenceMutation[];
  conflicts: { mutation: ProfilePreferenceMutation; remote: ProfilePreferenceRecord; reason?: string }[];
  failed: ProfilePreferenceMutation[];
}

function clonePreferenceRecord(record: ProfilePreferenceRecord): ProfilePreferenceRecord {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(record);
  }
  return JSON.parse(JSON.stringify(record)) as ProfilePreferenceRecord;
}

export async function enqueueProfilePreferenceMutation(
  mutation: Omit<
    ProfilePreferenceMutation,
    "id" | "timestamp" | "status" | "conflict" | keyof OfflineOperationMetadata
  > &
    Partial<OfflineOperationMetadata>
): Promise<ProfilePreferenceMutation> {
  const metadata = deriveMetadata(mutation);
  const record: ProfilePreferenceMutation = {
    ...mutation,
    ...metadata,
    id: mutation.id ?? generateId("pref-mutation"),
    timestamp: now(),
    status: "pending",
    conflict: null,
  } as ProfilePreferenceMutation;

  await registerDependencies(record);
  await putRecord("profilePreferenceQueue", record);
  return record;
}

export async function listProfilePreferenceMutations(userId?: string) {
  const records = await readAllRecords<ProfilePreferenceMutation>("profilePreferenceQueue");
  return records
    .filter((record) => (userId ? record.userId === userId : true))
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function updateProfilePreferenceMutation(
  id: string,
  patch: Partial<ProfilePreferenceMutation>
): Promise<void> {
  const existing = await readRecord<ProfilePreferenceMutation>("profilePreferenceQueue", id);
  if (!existing) return;
  const next = { ...existing, ...patch } as ProfilePreferenceMutation;
  await putRecord("profilePreferenceQueue", next);
  if (next.status === "synced" || next.status === "failed") {
    await markDependencyResolved(id);
  }
}

export async function deleteProfilePreferenceMutation(id: string): Promise<void> {
  await deleteRecord("profilePreferenceQueue", id);
  await markDependencyResolved(id);
}

export async function saveProfilePreferenceSnapshot(snapshot: ProfilePreferenceSnapshot) {
  return putRecord("profilePreferenceSnapshots", snapshot);
}

export async function getProfilePreferenceSnapshot(userId: string) {
  const records = await readAllRecords<ProfilePreferenceSnapshot>("profilePreferenceSnapshots");
  return records.find((record) => record.userId === userId) ?? null;
}

export async function saveCommentDraft(record: CommentDraftRecord) {
  const existing = await readRecord<CommentDraftRecord>("commentDrafts", record.id);
  const next: CommentDraftRecord = {
    ...existing,
    ...record,
    vectorClock: incrementVectorClock(record.vectorClock ?? existing?.vectorClock),
    updatedAt: record.updatedAt ?? now(),
  } as CommentDraftRecord;
  await registerDependencies(next);
  return putRecord("commentDrafts", next);
}

export async function getCommentDraft(id: string) {
  return readRecord<CommentDraftRecord>("commentDrafts", id);
}

export async function deleteCommentDraft(id: string) {
  await deleteRecord("commentDrafts", id);
  await markDependencyResolved(id);
}

export async function processProfilePreferenceQueue(
  userId: string,
  syncer: ProfilePreferenceSyncer
): Promise<ProcessPreferenceQueueResult> {
  const pending = await listProfilePreferenceMutations(userId);
  const processed: ProfilePreferenceMutation[] = [];
  const conflicts: ProcessPreferenceQueueResult["conflicts"] = [];
  const failed: ProfilePreferenceMutation[] = [];

  for (const mutation of pending) {
    await updateProfilePreferenceMutation(mutation.id, {
      status: "syncing",
      attempt: mutation.attempt + 1,
      lastAttemptAt: now(),
      conflict: null,
    });

    let outcome: SyncOutcome;
    try {
      outcome = await syncer({ ...mutation, status: "syncing" });
    } catch (error) {
      await updateProfilePreferenceMutation(mutation.id, { status: "pending" });
      throw error;
    }

    if (outcome.kind === "success") {
      await updateProfilePreferenceMutation(mutation.id, { status: "synced" });
      await deleteProfilePreferenceMutation(mutation.id);
      processed.push(mutation);
      continue;
    }

    if (outcome.kind === "conflict") {
      const conflictRecord = clonePreferenceRecord(outcome.remote as ProfilePreferenceRecord);
      await updateProfilePreferenceMutation(mutation.id, {
        status: "conflict",
        conflict: { remote: conflictRecord, reason: outcome.reason },
      });
      conflicts.push({
        mutation: { ...mutation, status: "conflict", conflict: { remote: conflictRecord, reason: outcome.reason } },
        remote: conflictRecord,
        reason: outcome.reason,
      });
      break;
    }

    await updateProfilePreferenceMutation(mutation.id, { status: "pending" });
    failed.push(mutation);
  }

  return { processed, conflicts, failed };
}

export type { BoardSyncMutationPayload as SyncPayload };

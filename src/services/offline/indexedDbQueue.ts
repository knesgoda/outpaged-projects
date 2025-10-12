import type { BoardViewMode } from "@/types/boards";

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
  | "batches";

const DB_NAME = "outpaged-board-offline";
const DB_VERSION = 2;
const STORE_CONFIG: Record<OfflineStoreName, { keyPath: string }> = {
  boardQueue: { keyPath: "id" },
  itemQueue: { keyPath: "id" },
  docOps: { keyPath: "id" },
  commentQueue: { keyPath: "id" },
  fileQueue: { keyPath: "id" },
  snapshots: { keyPath: "id" },
  dependencies: { keyPath: "id" },
  batches: { keyPath: "id" },
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
};

let dbPromise: Promise<IDBDatabase> | null = null;

const hasIndexedDb = typeof indexedDB !== "undefined";

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
  return { strategy: "lww", prefer: "local" };
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

async function putRecord<T extends { id: string }>(storeName: OfflineStoreName, record: T): Promise<T> {
  if (!hasIndexedDb) {
    memoryStores[storeName].set(record.id, JSON.parse(JSON.stringify(record)));
    return record;
  }

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Failed to write ${storeName}`));
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
    request.onsuccess = () => resolve(toRecord<T>(request.result));
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
    request.onsuccess = () => resolve((request.result as T[]) ?? []);
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
  const remoteClock = (remote?.vectorClock as VectorClock | undefined) ?? undefined;
  const comparison = compareVectorClocks(mutation.vectorClock, remoteClock);

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
      return { kind: "keep-local" };
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

export async function listBoardMutations(boardId: string, view?: BoardViewMode) {
  const records = await readAllRecords<BoardSyncMutation>("boardQueue");
  return records
    .filter((record) => record.boardId === boardId && (!view || record.view === view))
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

export async function listDocOperations(docId: string) {
  const all = await readAllRecords<DocCrdtOperation>("docOps");
  return all.filter((op) => op.docId === docId).sort((a, b) => a.timestamp - b.timestamp);
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

export type { BoardSyncMutationPayload as SyncPayload };

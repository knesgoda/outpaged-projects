import type { BoardViewMode } from "@/types/boards";

type MutationStatus = "pending" | "syncing" | "conflict" | "synced";

type SyncPayloadType = "update" | "move" | "create" | "delete";

export interface BoardSyncMutationPayload {
  type: SyncPayloadType;
  field?: string | null;
  from?: string | null;
  to?: string | null;
  changes?: Record<string, unknown>;
  item?: Record<string, unknown>;
}

export interface BoardSyncMutation {
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

export type SyncOutcome =
  | { kind: "success"; record?: Record<string, unknown> }
  | { kind: "conflict"; remote: Record<string, unknown>; reason?: string }
  | { kind: "skipped" };

const DB_NAME = "outpaged-board-offline";
const DB_VERSION = 1;
const QUEUE_STORE = "queue";
const SNAPSHOT_STORE = "snapshots";

const memoryQueue = new Map<string, BoardSyncMutation>();
const memorySnapshots = new Map<string, BoardSnapshot>();

let dbPromise: Promise<IDBDatabase> | null = null;

const hasIndexedDb = typeof indexedDB !== "undefined";

function openDatabase(): Promise<IDBDatabase> {
  if (!hasIndexedDb) {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          db.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
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

function putIntoMemoryQueue(record: BoardSyncMutation) {
  memoryQueue.set(record.id, record);
  return record;
}

function getAllFromMemoryQueue(boardId: string, view?: BoardViewMode) {
  const records = Array.from(memoryQueue.values());
  return records
    .filter((record) => record.boardId === boardId && (!view || record.view === view))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function deleteFromMemoryQueue(id: string) {
  memoryQueue.delete(id);
}

function putIntoMemorySnapshot(snapshot: BoardSnapshot) {
  memorySnapshots.set(snapshot.id, snapshot);
  return snapshot;
}

function getFromMemorySnapshot(boardId: string, view: BoardViewMode) {
  return memorySnapshots.get(snapshotKey(boardId, view)) ?? null;
}

export async function enqueueBoardMutation(
  mutation: Omit<BoardSyncMutation, "id" | "timestamp" | "status" | "conflict">
): Promise<BoardSyncMutation> {
  const record: BoardSyncMutation = {
    ...mutation,
    id: `mutation-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: Date.now(),
    status: "pending",
    conflict: null,
  };

  if (!hasIndexedDb) {
    return putIntoMemoryQueue(record);
  }

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to enqueue mutation"));
  });

  return record;
}

export async function listBoardMutations(boardId: string, view?: BoardViewMode) {
  if (!hasIndexedDb) {
    return getAllFromMemoryQueue(boardId, view);
  }

  const db = await openDatabase();
  return new Promise<BoardSyncMutation[]>((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readonly");
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = (request.result as BoardSyncMutation[])
        .filter((record) => record.boardId === boardId && (!view || record.view === view))
        .sort((a, b) => a.timestamp - b.timestamp);
      resolve(records);
    };

    request.onerror = () => reject(request.error ?? new Error("Failed to read queue"));
  });
}

export async function updateBoardMutation(id: string, patch: Partial<BoardSyncMutation>): Promise<void> {
  if (!hasIndexedDb) {
    const existing = memoryQueue.get(id);
    if (existing) {
      memoryQueue.set(id, { ...existing, ...patch });
    }
    return;
  }

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const record = toRecord<BoardSyncMutation>(getRequest.result);
      if (!record) {
        resolve();
        return;
      }
      const updated = { ...record, ...patch } satisfies BoardSyncMutation;
      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error ?? new Error("Failed to update mutation"));
    };

    getRequest.onerror = () => reject(getRequest.error ?? new Error("Failed to read mutation"));
  });
}

export async function deleteBoardMutation(id: string): Promise<void> {
  if (!hasIndexedDb) {
    deleteFromMemoryQueue(id);
    return;
  }

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete mutation"));
  });
}

export async function clearBoardMutations(boardId: string, view?: BoardViewMode) {
  if (!hasIndexedDb) {
    for (const record of getAllFromMemoryQueue(boardId, view)) {
      memoryQueue.delete(record.id);
    }
    return;
  }

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const deletions = (request.result as BoardSyncMutation[])
        .filter((record) => record.boardId === boardId && (!view || record.view === view))
        .map((record) =>
          new Promise<void>((resolveDeletion, rejectDeletion) => {
            const deleteRequest = store.delete(record.id);
            deleteRequest.onsuccess = () => resolveDeletion();
            deleteRequest.onerror = () =>
              rejectDeletion(deleteRequest.error ?? new Error("Failed to clear mutation"));
          })
        );

      Promise.all(deletions).then(() => resolve()).catch(reject);
    };

    request.onerror = () => reject(request.error ?? new Error("Failed to enumerate mutations"));
  });
}

export async function saveBoardSnapshot(snapshot: Omit<BoardSnapshot, "id"> & { id?: string }) {
  const record: BoardSnapshot = {
    ...snapshot,
    id: snapshot.id ?? snapshotKey(snapshot.boardId, snapshot.view),
  };

  if (!hasIndexedDb) {
    return putIntoMemorySnapshot(record);
  }

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SNAPSHOT_STORE, "readwrite");
    const store = transaction.objectStore(SNAPSHOT_STORE);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to store snapshot"));
  });

  return record;
}

export async function getBoardSnapshot(boardId: string, view: BoardViewMode) {
  if (!hasIndexedDb) {
    return getFromMemorySnapshot(boardId, view);
  }

  const db = await openDatabase();
  return new Promise<BoardSnapshot | null>((resolve, reject) => {
    const transaction = db.transaction(SNAPSHOT_STORE, "readonly");
    const store = transaction.objectStore(SNAPSHOT_STORE);
    const request = store.get(snapshotKey(boardId, view));

    request.onsuccess = () => {
      resolve(toRecord<BoardSnapshot>(request.result));
    };

    request.onerror = () => reject(request.error ?? new Error("Failed to read snapshot"));
  });
}

export interface ProcessQueueResult {
  processed: BoardSyncMutation[];
  conflicts: { mutation: BoardSyncMutation; remote: Record<string, unknown>; reason?: string }[];
}

export type QueueSyncer = (
  mutation: BoardSyncMutation,
  options?: { force?: boolean }
) => Promise<SyncOutcome>;

export async function processBoardMutationQueue(
  boardId: string,
  view: BoardViewMode,
  syncer: QueueSyncer
): Promise<ProcessQueueResult> {
  const pending = await listBoardMutations(boardId, view);
  const processed: BoardSyncMutation[] = [];
  const conflicts: ProcessQueueResult["conflicts"] = [];

  for (const mutation of pending) {
    if (mutation.status === "conflict" && mutation.conflict) {
      conflicts.push({ mutation, remote: mutation.conflict.remote, reason: mutation.conflict.reason });
      continue;
    }

    await updateBoardMutation(mutation.id, { status: "syncing", conflict: null });

    let outcome: SyncOutcome;
    try {
      outcome = await syncer(mutation);
    } catch (error) {
      await updateBoardMutation(mutation.id, { status: "pending" });
      throw error;
    }

    if (outcome.kind === "success") {
      await updateBoardMutation(mutation.id, { status: "synced" });
      await deleteBoardMutation(mutation.id);
      processed.push(mutation);
      continue;
    }

    if (outcome.kind === "conflict") {
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

  return { processed, conflicts };
}

export async function resolveBoardConflict(
  mutationId: string,
  resolution: "discard" | "retry",
  remoteReplacement?: Record<string, unknown>
) {
  if (resolution === "discard") {
    await deleteBoardMutation(mutationId);
    return;
  }

  if (resolution === "retry") {
    await updateBoardMutation(mutationId, {
      status: "pending",
      conflict: remoteReplacement ? { remote: remoteReplacement } : null,
    });
  }
}

export function isIndexedDbEnabled() {
  return hasIndexedDb;
}

export type { BoardSyncMutationPayload as SyncPayload };

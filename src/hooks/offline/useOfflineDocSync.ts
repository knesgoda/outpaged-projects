import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  enqueueDocOperation,
  listDocOperations,
  updateDocOperation,
  deleteDocOperation,
  type DocCrdtOperation,
  type ConflictPolicy,
  type VectorClock,
  type SyncOutcome,
} from "@/services/offline";

interface UseOfflineDocSyncOptions {
  docId: string;
  processor: (operation: DocCrdtOperation) => Promise<SyncOutcome>;
  defaultConflictPolicy?: ConflictPolicy;
}

interface UseOfflineDocSyncResult {
  operations: DocCrdtOperation[];
  enqueue: (
    ops: unknown[],
    metadata?: {
      conflictPolicy?: ConflictPolicy;
      vectorClock?: VectorClock;
      dependencies?: string[];
      batchKey?: string | null;
    }
  ) => Promise<DocCrdtOperation>;
  process: () => Promise<void>;
  isProcessing: boolean;
  conflict: DocCrdtOperation | null;
  resolveConflict: (mode: "local" | "remote", remote?: Record<string, unknown>) => Promise<void>;
  conflictUi: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
}

export function useOfflineDocSync({
  docId,
  processor,
  defaultConflictPolicy,
}: UseOfflineDocSyncOptions): UseOfflineDocSyncResult {
  const [operations, setOperations] = useState<DocCrdtOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conflict, setConflict] = useState<DocCrdtOperation | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const vectorClockRef = useRef<VectorClock>({});
  const defaultPolicyRef = useRef<ConflictPolicy | undefined>(defaultConflictPolicy);

  useEffect(() => {
    defaultPolicyRef.current = defaultConflictPolicy;
  }, [defaultConflictPolicy]);

  const load = useCallback(async () => {
    const next = await listDocOperations(docId);
    setOperations(next);
    const conflictEntry = next.find((operation) => operation.status === "conflict");
    if (conflictEntry) {
      setConflict(conflictEntry);
      setDrawerOpen(true);
    } else {
      setConflict(null);
      setDrawerOpen(false);
    }
    const latest = next[next.length - 1];
    if (latest?.vectorClock) {
      vectorClockRef.current = latest.vectorClock;
    }
  }, [docId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enqueue = useCallback<UseOfflineDocSyncResult["enqueue"]>(
    async (ops, metadata) => {
      const record = await enqueueDocOperation({
        docId,
        ops,
        conflictPolicy: metadata?.conflictPolicy ?? defaultPolicyRef.current,
        vectorClock: metadata?.vectorClock ?? vectorClockRef.current,
        dependencies: metadata?.dependencies ?? [],
        batchKey: metadata?.batchKey ?? null,
      });
      vectorClockRef.current = record.vectorClock;
      await load();
      return record;
    },
    [docId, load]
  );

  const process = useCallback(async () => {
    setIsProcessing(true);
    try {
      const current = await listDocOperations(docId);
      for (const operation of current) {
        if (operation.status === "conflict") {
          setConflict(operation);
          setDrawerOpen(true);
          break;
        }
        const outcome = await processor(operation);
        if (outcome.kind === "success") {
          await deleteDocOperation(operation.id);
        } else if (outcome.kind === "skipped") {
          await updateDocOperation(operation.id, { status: "pending" });
        } else {
          await updateDocOperation(operation.id, {
            status: "conflict",
            ops: operation.ops,
          });
          setConflict({ ...operation, status: "conflict" });
          setDrawerOpen(true);
          break;
        }
      }
    } finally {
      setIsProcessing(false);
      await load();
    }
  }, [docId, processor, load]);

  const resolveConflict = useCallback<UseOfflineDocSyncResult["resolveConflict"]>(
    async (mode, remote) => {
      if (!conflict) return;
      if (mode === "remote") {
        await updateDocOperation(conflict.id, {
          status: "synced",
          ops: remote ? [remote] : conflict.ops,
        });
        await deleteDocOperation(conflict.id);
      } else {
        await updateDocOperation(conflict.id, { status: "pending" });
      }
      setConflict(null);
      setDrawerOpen(false);
      await load();
    },
    [conflict, load]
  );

  const conflictUi = useMemo(
    () => ({
      isOpen: isDrawerOpen,
      open: () => setDrawerOpen(true),
      close: () => setDrawerOpen(false),
    }),
    [isDrawerOpen]
  );

  return useMemo(
    () => ({
      operations,
      enqueue,
      process,
      isProcessing,
      conflict,
      resolveConflict,
      conflictUi,
    }),
    [operations, enqueue, process, isProcessing, conflict, resolveConflict, conflictUi]
  );
}

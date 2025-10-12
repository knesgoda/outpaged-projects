import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  enqueueCommentMutation,
  listCommentMutations,
  updateCommentMutation,
  deleteCommentMutation,
  type CommentMutation,
  type ConflictPolicy,
  type VectorClock,
  type SyncOutcome,
} from "@/services/offline";

interface UseOfflineCommentSyncOptions {
  threadId: string;
  processor: (mutation: CommentMutation) => Promise<SyncOutcome>;
  defaultConflictPolicy?: ConflictPolicy;
}

interface UseOfflineCommentSyncResult {
  mutations: CommentMutation[];
  enqueue: (
    payload: Record<string, unknown>,
    metadata?: {
      conflictPolicy?: ConflictPolicy;
      vectorClock?: VectorClock;
      dependencies?: string[];
      batchKey?: string | null;
    }
  ) => Promise<CommentMutation>;
  process: () => Promise<void>;
  isProcessing: boolean;
  conflict: CommentMutation | null;
  resolveConflict: (mode: "local" | "remote", remote?: Record<string, unknown>) => Promise<void>;
  conflictUi: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
}

export function useOfflineCommentSync({
  threadId,
  processor,
  defaultConflictPolicy,
}: UseOfflineCommentSyncOptions): UseOfflineCommentSyncResult {
  const [mutations, setMutations] = useState<CommentMutation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conflict, setConflict] = useState<CommentMutation | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const vectorClockRef = useRef<VectorClock>({});
  const defaultPolicyRef = useRef<ConflictPolicy | undefined>(defaultConflictPolicy);

  useEffect(() => {
    defaultPolicyRef.current = defaultConflictPolicy;
  }, [defaultConflictPolicy]);

  const load = useCallback(async () => {
    const next = await listCommentMutations(threadId);
    setMutations(next);
    const conflictEntry = next.find((mutation) => mutation.status === "conflict");
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
  }, [threadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const enqueue = useCallback<UseOfflineCommentSyncResult["enqueue"]>(
    async (payload, metadata) => {
      const record = await enqueueCommentMutation({
        commentId: threadId,
        payload,
        conflictPolicy: metadata?.conflictPolicy ?? defaultPolicyRef.current,
        vectorClock: metadata?.vectorClock ?? vectorClockRef.current,
        dependencies: metadata?.dependencies ?? [],
        batchKey: metadata?.batchKey ?? null,
      });
      vectorClockRef.current = record.vectorClock;
      await load();
      return record;
    },
    [threadId, load]
  );

  const process = useCallback(async () => {
    setIsProcessing(true);
    try {
      const current = await listCommentMutations(threadId);
      for (const mutation of current) {
        if (mutation.status === "conflict") {
          setConflict(mutation);
          setDrawerOpen(true);
          break;
        }
        const outcome = await processor(mutation);
        if (outcome.kind === "success") {
          await deleteCommentMutation(mutation.id);
        } else if (outcome.kind === "skipped") {
          await updateCommentMutation(mutation.id, { status: "pending" });
        } else {
          await updateCommentMutation(mutation.id, { status: "conflict" });
          setConflict({ ...mutation, status: "conflict" });
          setDrawerOpen(true);
          break;
        }
      }
    } finally {
      setIsProcessing(false);
      await load();
    }
  }, [threadId, processor, load]);

  const resolveConflict = useCallback<UseOfflineCommentSyncResult["resolveConflict"]>(
    async (mode, remote) => {
      if (!conflict) return;
      if (mode === "remote") {
        await updateCommentMutation(conflict.id, { status: "synced", payload: remote ?? conflict.payload });
        await deleteCommentMutation(conflict.id);
      } else {
        await updateCommentMutation(conflict.id, { status: "pending" });
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
      mutations,
      enqueue,
      process,
      isProcessing,
      conflict,
      resolveConflict,
      conflictUi,
    }),
    [mutations, enqueue, process, isProcessing, conflict, resolveConflict, conflictUi]
  );
}

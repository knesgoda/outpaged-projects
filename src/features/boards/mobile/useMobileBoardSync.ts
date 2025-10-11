import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import type { BoardViewMode } from "@/types/boards";

import {
  enqueueBoardMutation,
  listBoardMutations,
  saveBoardSnapshot,
  processBoardMutationQueue,
  resolveBoardConflict,
  type BoardSyncMutation,
  type BoardSyncMutationPayload,
  type QueueSyncer,
  type ProcessQueueResult,
  type BoardSnapshot,
} from "@/services/offline";

import type { BoardViewRecord } from "../views/context";

export interface UseMobileBoardSyncOptions {
  boardId: string;
  view: BoardViewMode;
  items: BoardViewRecord[];
  syncer: QueueSyncer;
  onApplyRemote?: (record: Record<string, unknown>) => void;
}

export interface UseMobileBoardSyncResult {
  queue: BoardSyncMutation[];
  enqueue: (
    itemId: string,
    payload: BoardSyncMutationPayload,
    nextItems?: BoardViewRecord[],
    metadata?: { baseVersion?: string | number | null }
  ) => Promise<BoardSyncMutation>;
  refresh: () => Promise<void>;
  conflict: ProcessQueueResult["conflicts"][number] | null;
  resolveConflict: (resolution: "local" | "remote") => Promise<void>;
  isProcessing: boolean;
  snapshot?: BoardSnapshot | null;
}

export function useMobileBoardSync({
  boardId,
  view,
  items,
  syncer,
  onApplyRemote,
}: UseMobileBoardSyncOptions): UseMobileBoardSyncResult {
  const { toast } = useToast();
  const [queue, setQueue] = useState<BoardSyncMutation[]>([]);
  const [conflict, setConflict] = useState<ProcessQueueResult["conflicts"][number] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null);

  const loadQueue = useCallback(async () => {
    const next = await listBoardMutations(boardId, view);
    setQueue(next);
    const conflictEntry = next.find((mutation) => mutation.status === "conflict" && mutation.conflict);
    if (conflictEntry && conflictEntry.conflict) {
      setConflict({ mutation: conflictEntry, remote: conflictEntry.conflict.remote, reason: conflictEntry.conflict.reason });
    } else {
      setConflict(null);
    }
  }, [boardId, view]);

  const persistSnapshot = useCallback(async () => {
    const record = await saveBoardSnapshot({ boardId, view, items, updatedAt: Date.now() });
    setSnapshot(record);
  }, [boardId, view, items]);

  const runProcessor = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setIsProcessing(true);
    try {
      const result = await processBoardMutationQueue(boardId, view, syncer);
      if (result.conflicts.length > 0) {
        setConflict(result.conflicts[0]);
        toast({
          title: "Sync conflict detected",
          description: "Choose how to merge your offline changes",
          variant: "destructive",
        });
      } else if (result.processed.length > 0) {
        toast({ title: "Synced", description: `${result.processed.length} change(s) uploaded` });
      }
    } finally {
      setIsProcessing(false);
      await loadQueue();
    }
  }, [boardId, view, syncer, loadQueue, toast]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    void persistSnapshot();
  }, [persistSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => {
      toast({ title: "Back online", description: "Syncing your latest updates" });
      void runProcessor();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [runProcessor, toast]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }
    if (navigator.onLine) {
      void runProcessor();
    }
  }, [runProcessor]);

  const enqueue = useCallback<UseMobileBoardSyncResult["enqueue"]>(
    async (itemId, payload, nextItems, metadata) => {
      const record = await enqueueBoardMutation({
        boardId,
        view,
        itemId,
        payload,
        baseVersion: metadata?.baseVersion ?? null,
      });

      if (nextItems) {
        const snapshotRecord = await saveBoardSnapshot({ boardId, view, items: nextItems, updatedAt: Date.now() });
        setSnapshot(snapshotRecord);
      }

      await loadQueue();

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast({
          title: "Offline",
          description: "Saved locally. We'll sync this when you're back online.",
        });
      }

      return record;
    },
    [boardId, view, toast, loadQueue]
  );

  const resolveConflict = useCallback<UseMobileBoardSyncResult["resolveConflict"]>(
    async (resolution) => {
      if (!conflict) return;

      if (resolution === "remote") {
        onApplyRemote?.(conflict.remote);
        await resolveBoardConflict(conflict.mutation.id, "discard");
        setConflict(null);
        await loadQueue();
        return;
      }

      await resolveBoardConflict(conflict.mutation.id, "retry");
      setConflict(null);
      await loadQueue();
      await runProcessor();
    },
    [conflict, onApplyRemote, loadQueue, runProcessor]
  );

  return useMemo(
    () => ({
      queue,
      enqueue,
      refresh: loadQueue,
      conflict,
      resolveConflict,
      isProcessing,
      snapshot,
    }),
    [queue, enqueue, loadQueue, conflict, resolveConflict, isProcessing, snapshot]
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import type { BoardViewMode } from "@/types/boards";

import {
  enqueueBoardMutation,
  listBoardMutations,
  saveBoardSnapshot,
  processBoardMutationQueue,
  resolveBoardConflict,
  deleteBoardMutation,
  updateBoardMutation,
  type BoardSyncMutation,
  type BoardSyncMutationPayload,
  type QueueSyncer,
  type ProcessQueueResult,
  type BoardSnapshot,
  type VectorClock,
  type ConflictPolicy,
} from "@/services/offline";

import type { BoardViewRecord } from "../views/context";

export interface UseMobileBoardSyncOptions {
  boardId: string;
  view: BoardViewMode;
  items: BoardViewRecord[];
  syncer: QueueSyncer;
  onApplyRemote?: (record: Record<string, unknown>) => void;
  defaultConflictPolicy?: ConflictPolicy;
}

export interface UseMobileBoardSyncResult {
  queue: BoardSyncMutation[];
  enqueue: (
    itemId: string,
    payload: BoardSyncMutationPayload,
    nextItems?: BoardViewRecord[],
    metadata?: {
      baseVersion?: string | number | null;
      conflictPolicy?: ConflictPolicy;
      vectorClock?: VectorClock;
      dependencies?: string[];
      batchKey?: string | null;
    }
  ) => Promise<BoardSyncMutation>;
  refresh: () => Promise<void>;
  conflict: ProcessQueueResult["conflicts"][number] | null;
  resolveConflict: (resolution: "local" | "remote") => Promise<void>;
  isProcessing: boolean;
  snapshot?: BoardSnapshot | null;
  appliedRemote: ProcessQueueResult["appliedRemote"];
  skipped: ProcessQueueResult["skipped"];
  retry: (mutationId?: string) => Promise<void>;
  skip: (mutationId: string) => Promise<void>;
  backoff: { attempt: number; nextRun: number | null };
  conflictUi: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
  resetBackoff: () => void;
}

export function useMobileBoardSync({
  boardId,
  view,
  items,
  syncer,
  onApplyRemote,
  defaultConflictPolicy,
}: UseMobileBoardSyncOptions): UseMobileBoardSyncResult {
  const { toast } = useToast();
  const [queue, setQueue] = useState<BoardSyncMutation[]>([]);
  const [conflict, setConflict] = useState<ProcessQueueResult["conflicts"][number] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null);
  const [appliedRemote, setAppliedRemote] = useState<ProcessQueueResult["appliedRemote"]>([]);
  const [skipped, setSkipped] = useState<ProcessQueueResult["skipped"]>([]);
  const [backoff, setBackoff] = useState<{ attempt: number; nextRun: number | null }>({ attempt: 0, nextRun: null });
  const [isConflictDrawerOpen, setConflictDrawerOpen] = useState(false);

  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vectorClockRef = useRef<VectorClock>({});
  const defaultPolicyRef = useRef<ConflictPolicy | undefined>(defaultConflictPolicy);

  useEffect(() => {
    defaultPolicyRef.current = defaultConflictPolicy;
  }, [defaultConflictPolicy]);

  const loadQueue = useCallback(async () => {
    const next = await listBoardMutations(boardId, view);
    setQueue(next);
    const conflictEntry = next.find((mutation) => mutation.status === "conflict" && mutation.conflict);
    if (conflictEntry && conflictEntry.conflict) {
      setConflict({ mutation: conflictEntry, remote: conflictEntry.conflict.remote, reason: conflictEntry.conflict.reason });
      setConflictDrawerOpen(true);
    } else {
      setConflict(null);
      setConflictDrawerOpen(false);
    }

    const mostRecent = next[next.length - 1];
    if (mostRecent?.vectorClock) {
      vectorClockRef.current = mostRecent.vectorClock;
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
      setAppliedRemote(result.appliedRemote);
      setSkipped(result.skipped);

      if (result.appliedRemote.length > 0) {
        for (const entry of result.appliedRemote) {
          onApplyRemote?.(entry.record);
        }
      }

      if (result.conflicts.length > 0) {
        setConflict(result.conflicts[0]);
        setConflictDrawerOpen(true);
        toast({
          title: "Sync conflict detected",
          description: "Choose how to merge your offline changes",
          variant: "destructive",
        });
      } else if (result.processed.length > 0) {
        toast({ title: "Synced", description: `${result.processed.length} change(s) uploaded` });
      }

      if (result.skipped.length > 0) {
        toast({
          title: "Waiting on dependencies",
          description: `${result.skipped.length} change(s) queued behind other updates`,
        });
      }
    } finally {
      setIsProcessing(false);
      setBackoff({ attempt: 0, nextRun: null });
      await loadQueue();
    }
  }, [boardId, view, syncer, loadQueue, toast, onApplyRemote]);

  const scheduleReplay = useCallback(
    (immediate = false) => {
      if (backgroundTimer.current) {
        clearTimeout(backgroundTimer.current);
        backgroundTimer.current = null;
      }

      const nextAttempt = immediate ? 0 : backoff.attempt + 1;
      const delay = immediate ? 0 : Math.min(60_000, 2 ** nextAttempt * 1000);

      backgroundTimer.current = setTimeout(() => {
        backgroundTimer.current = null;
        void runProcessor();
      }, delay);

      setBackoff({ attempt: nextAttempt, nextRun: immediate ? null : Date.now() + delay });
    },
    [backoff.attempt, runProcessor]
  );

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
      scheduleReplay(true);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [scheduleReplay, toast]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }
    if (navigator.onLine) {
      scheduleReplay(true);
    }
  }, [scheduleReplay]);

  useEffect(() => {
    const hasPending = queue.some((item) => item.status === "pending" || item.status === "failed");
    if (!hasPending) {
      if (backgroundTimer.current) {
        clearTimeout(backgroundTimer.current);
        backgroundTimer.current = null;
      }
      setBackoff({ attempt: 0, nextRun: null });
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine) {
      scheduleReplay(backoff.attempt === 0);
    }
  }, [queue, backoff.attempt, scheduleReplay]);

  useEffect(() => {
    return () => {
      if (backgroundTimer.current) {
        clearTimeout(backgroundTimer.current);
      }
    };
  }, []);

  const enqueue = useCallback<UseMobileBoardSyncResult["enqueue"]>(
    async (itemId, payload, nextItems, metadata) => {
      const record = await enqueueBoardMutation({
        boardId,
        view,
        itemId,
        payload,
        baseVersion: metadata?.baseVersion ?? null,
        conflictPolicy: metadata?.conflictPolicy ?? defaultPolicyRef.current,
        vectorClock: metadata?.vectorClock ?? vectorClockRef.current,
        dependencies: metadata?.dependencies ?? [],
        batchKey: metadata?.batchKey ?? null,
      });

      vectorClockRef.current = record.vectorClock;

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
      } else {
        scheduleReplay(true);
      }

      return record;
    },
    [boardId, view, toast, loadQueue, scheduleReplay]
  );

  const resolveConflictCallback = useCallback<UseMobileBoardSyncResult["resolveConflict"]>(
    async (resolution) => {
      if (!conflict) return;

      if (resolution === "remote") {
        onApplyRemote?.(conflict.remote);
        await resolveBoardConflict(conflict.mutation.id, "discard", conflict.remote);
        setConflict(null);
        setConflictDrawerOpen(false);
        await loadQueue();
        return;
      }

      await resolveBoardConflict(conflict.mutation.id, "retry");
      setConflict(null);
      setConflictDrawerOpen(false);
      await loadQueue();
      await runProcessor();
    },
    [conflict, onApplyRemote, loadQueue, runProcessor]
  );

  const retry = useCallback<UseMobileBoardSyncResult["retry"]>(
    async (mutationId) => {
      if (mutationId) {
        await updateBoardMutation(mutationId, { status: "pending", attempt: 0 });
      }
      setBackoff({ attempt: 0, nextRun: null });
      await runProcessor();
    },
    [runProcessor]
  );

  const skip = useCallback<UseMobileBoardSyncResult["skip"]>(
    async (mutationId) => {
      await deleteBoardMutation(mutationId);
      await loadQueue();
    },
    [loadQueue]
  );

  const conflictUi = useMemo(
    () => ({
      isOpen: isConflictDrawerOpen,
      open: () => setConflictDrawerOpen(true),
      close: () => setConflictDrawerOpen(false),
    }),
    [isConflictDrawerOpen]
  );

  const resetBackoff = useCallback(() => {
    setBackoff({ attempt: 0, nextRun: null });
    if (typeof navigator !== "undefined" && navigator.onLine) {
      scheduleReplay(true);
    }
  }, [scheduleReplay]);

  return useMemo(
    () => ({
      queue,
      enqueue,
      refresh: loadQueue,
      conflict,
      resolveConflict: resolveConflictCallback,
      isProcessing,
      snapshot,
      appliedRemote,
      skipped,
      retry,
      skip,
      backoff,
      conflictUi,
      resetBackoff,
    }),
    [
      queue,
      enqueue,
      loadQueue,
      conflict,
      resolveConflictCallback,
      isProcessing,
      snapshot,
      appliedRemote,
      skipped,
      retry,
      skip,
      backoff,
      conflictUi,
      resetBackoff,
    ]
  );
}

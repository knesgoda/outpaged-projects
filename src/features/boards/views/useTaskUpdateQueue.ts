import { useCallback, useEffect, useRef } from "react";

import type { BoardViewRecord } from "./context";
import {
  batchUpdateTaskFields,
  type BatchedTaskUpdateInput,
} from "@/services/tasksService";

interface QueueJob {
  update: BatchedTaskUpdateInput;
  resolve: () => void;
  reject: (error: unknown) => void;
}

export interface UseTaskUpdateQueueOptions {
  flushIntervalMs?: number;
  maxBatchSize?: number;
  onSuccess?: (records: BoardViewRecord[]) => void;
  onError?: (error: unknown, updates: BatchedTaskUpdateInput[]) => void;
}

const DEFAULT_INTERVAL = 120;
const DEFAULT_BATCH_SIZE = 32;

export function useTaskUpdateQueue({
  flushIntervalMs = DEFAULT_INTERVAL,
  maxBatchSize = DEFAULT_BATCH_SIZE,
  onSuccess,
  onError,
}: UseTaskUpdateQueueOptions = {}) {
  const queueRef = useRef<QueueJob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef<Promise<void> | null>(null);

  const flush = useCallback(async () => {
    if (flushingRef.current) {
      await flushingRef.current;
      return;
    }

    const jobs = queueRef.current.splice(0, queueRef.current.length);
    if (jobs.length === 0) {
      return;
    }

    const updates = jobs.map((job) => job.update);

    const promise = batchUpdateTaskFields(updates)
      .then((records) => {
        onSuccess?.(records as BoardViewRecord[]);
        jobs.forEach((job) => job.resolve());
      })
      .catch((error) => {
        onError?.(error, updates);
        jobs.forEach((job) => job.reject(error));
      })
      .finally(() => {
        flushingRef.current = null;
        if (queueRef.current.length > 0) {
          void flush();
        }
      });

    flushingRef.current = promise;
    await promise;
  }, [onError, onSuccess]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) {
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, flushIntervalMs);
  }, [flush, flushIntervalMs]);

  const enqueue = useCallback(
    (update: BatchedTaskUpdateInput) =>
      new Promise<void>((resolve, reject) => {
        queueRef.current.push({ update, resolve, reject });

        if (queueRef.current.length >= maxBatchSize) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          void flush();
          return;
        }

        scheduleFlush();
      }),
    [flush, maxBatchSize, scheduleFlush]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (queueRef.current.length > 0) {
        void flush();
      }
    };
  }, [flush]);

  return { enqueue, flush } as const;
}

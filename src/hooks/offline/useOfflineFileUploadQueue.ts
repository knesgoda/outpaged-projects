import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  enqueueFileUpload,
  listFileUploads,
  updateFileUpload,
  deleteFileUpload,
  createResumableUploadAdapter,
  type FileUploadRecord,
  type ConflictPolicy,
  type VectorClock,
  type SyncOutcome,
} from "@/services/offline";

interface UseOfflineFileUploadQueueOptions {
  uploader: (record: FileUploadRecord) => Promise<SyncOutcome>;
  autoStart?: boolean;
  defaultConflictPolicy?: ConflictPolicy;
}

interface UseOfflineFileUploadQueueResult {
  uploads: FileUploadRecord[];
  enqueue: (
    fileId: string,
    payload: Record<string, unknown>,
    parts: Array<{ partNumber: number; etag?: string }>,
    metadata?: {
      conflictPolicy?: ConflictPolicy;
      vectorClock?: VectorClock;
      dependencies?: string[];
      batchKey?: string | null;
    }
  ) => Promise<FileUploadRecord>;
  process: () => Promise<void>;
  retry: (uploadId: string) => Promise<void>;
  skip: (uploadId: string) => Promise<void>;
  conflict: FileUploadRecord | null;
  conflictUi: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
}

export function useOfflineFileUploadQueue({
  uploader,
  autoStart = true,
  defaultConflictPolicy,
}: UseOfflineFileUploadQueueOptions): UseOfflineFileUploadQueueResult {
  const [uploads, setUploads] = useState<FileUploadRecord[]>([]);
  const [conflict, setConflict] = useState<FileUploadRecord | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const vectorClockRef = useRef<VectorClock>({});
  const defaultPolicyRef = useRef<ConflictPolicy | undefined>(defaultConflictPolicy);

  useEffect(() => {
    defaultPolicyRef.current = defaultConflictPolicy;
  }, [defaultConflictPolicy]);

  const load = useCallback(async () => {
    const next = await listFileUploads();
    setUploads(next);
    const conflictEntry = next.find((upload) => upload.status === "conflict");
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const process = useCallback(async () => {
    const adapter = createResumableUploadAdapter(async (record) => {
      const outcome = await uploader(record);
      if (outcome.kind === "conflict") {
        setConflict({ ...record, status: "conflict" });
        setDrawerOpen(true);
      }
      return outcome;
    });
    await adapter();
    await load();
  }, [uploader, load]);

  useEffect(() => {
    if (!autoStart) return;
    if (uploads.length === 0) return;
    void process();
  }, [uploads.length, autoStart, process]);

  const enqueue = useCallback<UseOfflineFileUploadQueueResult["enqueue"]>(
    async (fileId, payload, parts, metadata) => {
      const record = await enqueueFileUpload({
        fileId,
        payload,
        parts,
        conflictPolicy: metadata?.conflictPolicy ?? defaultPolicyRef.current,
        vectorClock: metadata?.vectorClock ?? vectorClockRef.current,
        dependencies: metadata?.dependencies ?? [],
        batchKey: metadata?.batchKey ?? null,
      });
      vectorClockRef.current = record.vectorClock;
      await load();
      if (autoStart) {
        void process();
      }
      return record;
    },
    [autoStart, load, process]
  );

  const retry = useCallback<UseOfflineFileUploadQueueResult["retry"]>(
    async (uploadId) => {
      await updateFileUpload(uploadId, { status: "pending", attempt: 0 });
      setConflict(null);
      setDrawerOpen(false);
      if (autoStart) {
        void process();
      }
    },
    [autoStart, process]
  );

  const skip = useCallback<UseOfflineFileUploadQueueResult["skip"]>(
    async (uploadId) => {
      await deleteFileUpload(uploadId);
      setConflict(null);
      setDrawerOpen(false);
      await load();
    },
    [load]
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
    () => ({ uploads, enqueue, process, retry, skip, conflict, conflictUi }),
    [uploads, enqueue, process, retry, skip, conflict, conflictUi]
  );
}

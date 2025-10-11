import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type BoardNetworkState = "online" | "offline" | "syncing" | "error";

interface QueuedChange {
  id: string;
  description: string;
  retry: () => Promise<void>;
}

interface QueueChangeInput {
  description: string;
  retry: () => Promise<void>;
  errorMessage?: string | null;
}

interface BoardHistoryEntry {
  id?: string;
  description: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
}

export interface BoardConflictInput {
  id: string;
  title?: string;
  message?: string;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  onResolve: (choice: "local" | "remote") => Promise<void> | void;
}

interface BoardConflictValue extends Omit<BoardConflictInput, "onResolve"> {}

interface BoardStateContextValue {
  networkState: BoardNetworkState;
  lastError: string | null;
  queuedChanges: QueuedChange[];
  queueChange: (input: QueueChangeInput) => string;
  retryQueuedChanges: () => Promise<void>;
  clearQueuedChanges: () => void;
  cancelQueuedChange: (id: string) => void;
  pushHistory: (entry: BoardHistoryEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  conflict: BoardConflictValue | null;
  openConflict: (conflict: BoardConflictInput) => void;
  resolveConflict: (choice: "local" | "remote") => Promise<void>;
}

const BoardStateContext = createContext<BoardStateContextValue | null>(null);

function useNetworkInitialState(): BoardNetworkState {
  if (typeof navigator === "undefined") {
    return "online";
  }
  return navigator.onLine ? "online" : "offline";
}

export function BoardStateProvider({ children }: PropsWithChildren): ReactNode {
  const [networkState, setNetworkState] = useState<BoardNetworkState>(useNetworkInitialState);
  const [lastError, setLastError] = useState<string | null>(null);
  const [queuedChanges, setQueuedChanges] = useState<QueuedChange[]>([]);

  const queueRef = useRef<QueuedChange[]>([]);
  const undoStackRef = useRef<BoardHistoryEntry[]>([]);
  const redoStackRef = useRef<BoardHistoryEntry[]>([]);
  const conflictResolverRef = useRef<BoardConflictInput["onResolve"] | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [conflict, setConflict] = useState<BoardConflictValue | null>(null);

  useEffect(() => {
    queueRef.current = queuedChanges;
  }, [queuedChanges]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => {
      setNetworkState("online");
      setLastError(null);
    };
    const handleOffline = () => {
      setNetworkState("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const queueChange = useCallback(
    ({ description, retry, errorMessage }: QueueChangeInput) => {
      const id = `queued-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setQueuedChanges((prev) => [...prev, { id, description, retry }]);
      if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
        setLastError(errorMessage);
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setNetworkState("offline");
      } else {
        setNetworkState("error");
      }
      return id;
    },
    []
  );

  const cancelQueuedChange = useCallback((id: string) => {
    setQueuedChanges((prev) => prev.filter((change) => change.id !== id));
    if (queueRef.current.length <= 1) {
      setNetworkState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online");
    }
  }, []);

  const clearQueuedChanges = useCallback(() => {
    setQueuedChanges([]);
    setLastError(null);
    setNetworkState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online");
  }, []);

  const retryQueuedChanges = useCallback(async () => {
    const current = queueRef.current;
    if (current.length === 0) {
      return;
    }

    setNetworkState("syncing");
    setLastError(null);

    for (const change of [...current]) {
      try {
        await change.retry();
        setQueuedChanges((prev) => prev.filter((entry) => entry.id !== change.id));
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
        setNetworkState("error");
        return;
      }
    }

    setNetworkState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online");
  }, []);

  const updateHistoryState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const pushHistory = useCallback((entry: BoardHistoryEntry) => {
    const enriched = { ...entry, id: entry.id ?? `history-${Date.now()}-${Math.random().toString(16).slice(2)}` };
    undoStackRef.current = [...undoStackRef.current, enriched];
    redoStackRef.current = [];
    updateHistoryState();
  }, [updateHistoryState]);

  const undo = useCallback(async () => {
    const stack = undoStackRef.current;
    if (stack.length === 0) {
      return;
    }
    const entry = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    try {
      await entry.undo();
      redoStackRef.current = [...redoStackRef.current, entry];
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      updateHistoryState();
    }
  }, [updateHistoryState]);

  const redo = useCallback(async () => {
    const stack = redoStackRef.current;
    if (stack.length === 0) {
      return;
    }
    const entry = stack[stack.length - 1];
    redoStackRef.current = stack.slice(0, -1);
    try {
      await entry.redo();
      undoStackRef.current = [...undoStackRef.current, entry];
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      updateHistoryState();
    }
  }, [updateHistoryState]);

  const openConflict = useCallback((value: BoardConflictInput) => {
    conflictResolverRef.current = value.onResolve;
    setConflict({
      id: value.id,
      title: value.title,
      message: value.message,
      local: value.local,
      remote: value.remote,
    });
  }, []);

  const resolveConflict = useCallback(
    async (choice: "local" | "remote") => {
      const handler = conflictResolverRef.current;
      conflictResolverRef.current = null;
      setConflict(null);
      if (!handler) {
        return;
      }
      await handler(choice);
    },
    []
  );

  const value = useMemo<BoardStateContextValue>(
    () => ({
      networkState,
      lastError,
      queuedChanges,
      queueChange,
      retryQueuedChanges,
      clearQueuedChanges,
      cancelQueuedChange,
      pushHistory,
      undo,
      redo,
      canUndo,
      canRedo,
      conflict,
      openConflict,
      resolveConflict,
    }),
    [
      cancelQueuedChange,
      canRedo,
      canUndo,
      clearQueuedChanges,
      conflict,
      lastError,
      networkState,
      openConflict,
      pushHistory,
      queuedChanges,
      redo,
      resolveConflict,
      retryQueuedChanges,
      undo,
    ]
  );

  return <BoardStateContext.Provider value={value}>{children}</BoardStateContext.Provider>;
}

export function useBoardState() {
  const context = useContext(BoardStateContext);
  if (!context) {
    throw new Error("useBoardState must be used within a BoardStateProvider");
  }
  return context;
}

function formatNetworkMessage(state: BoardNetworkState, queuedChanges: QueuedChange[], lastError: string | null) {
  const count = queuedChanges.length;
  switch (state) {
    case "offline":
      return {
        title: "You're offline",
        description:
          count > 0
            ? `We have ${count} queued ${count === 1 ? "change" : "changes"}. We'll retry when you're back online.`
            : "You're currently offline. Changes will be queued.",
      };
    case "syncing":
      return {
        title: "Syncing queued changes",
        description:
          count > 0
            ? `Uploading ${count} pending ${count === 1 ? "change" : "changes"}…`
            : "Finishing sync…",
      };
    case "error":
      return {
        title: "Unable to sync changes",
        description: lastError ?? "We'll retry shortly.",
      };
    default:
      return {
        title: "Queued changes",
        description: count > 0 ? `There are ${count} change(s) waiting to sync.` : null,
      };
  }
}

interface BoardStateShellProps {
  children: ReactNode;
}

export function BoardStateShell({ children }: BoardStateShellProps) {
  const {
    networkState,
    lastError,
    queuedChanges,
    retryQueuedChanges,
    clearQueuedChanges,
    undo,
    redo,
    canUndo,
    canRedo,
    conflict,
    resolveConflict,
  } = useBoardState();

  const banner = useMemo(() => formatNetworkMessage(networkState, queuedChanges, lastError), [
    lastError,
    networkState,
    queuedChanges,
  ]);

  const showBanner =
    networkState !== "online" || lastError || queuedChanges.length > 0;

  return (
    <div className="space-y-4">
      {showBanner ? (
        <Alert data-testid="board-offline-banner">
          <AlertTitle>{banner.title}</AlertTitle>
          {banner.description ? <AlertDescription>{banner.description}</AlertDescription> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                void retryQueuedChanges();
              }}
              disabled={queuedChanges.length === 0 && networkState !== "error"}
            >
              Retry queued changes
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                clearQueuedChanges();
              }}
              disabled={queuedChanges.length === 0}
            >
              Clear queue
            </Button>
            {queuedChanges.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {queuedChanges.length} {queuedChanges.length === 1 ? "change" : "changes"} waiting
              </span>
            ) : null}
          </div>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void undo();
          }}
          disabled={!canUndo}
          aria-label="Undo change"
        >
          Undo
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void redo();
          }}
          disabled={!canRedo}
          aria-label="Redo change"
        >
          Redo
        </Button>
      </div>

      {children}

      <BoardConflictDialog conflict={conflict} onResolve={resolveConflict} />
    </div>
  );
}

interface BoardConflictDialogProps {
  conflict: BoardConflictValue | null;
  onResolve: (choice: "local" | "remote") => void;
}

function BoardConflictDialog({ conflict, onResolve }: BoardConflictDialogProps) {
  const open = Boolean(conflict);

  const diff = useMemo(() => {
    if (!conflict) {
      return [] as { field: string; local: unknown; remote: unknown }[];
    }
    const fields = new Set<string>();
    Object.keys(conflict.local ?? {}).forEach((key) => fields.add(key));
    Object.keys(conflict.remote ?? {}).forEach((key) => fields.add(key));
    return Array.from(fields).map((field) => ({
      field,
      local: conflict.local[field],
      remote: conflict.remote[field],
    }));
  }, [conflict]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent data-testid="board-conflict-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{conflict?.title ?? "Resolve conflict"}</AlertDialogTitle>
          <AlertDialogDescription>
            {conflict?.message ??
              "We detected simultaneous edits. Choose which version to keep."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          {diff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No field differences detected.</p>
          ) : (
            diff.map(({ field, local, remote }) => (
              <div key={field} className="rounded-md border bg-muted/20 p-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{field}</span>
                  <Badge variant="outline">conflict</Badge>
                </div>
                <div className="mt-2 grid gap-2 text-sm">
                  <div>
                    <span className="font-semibold">Your change:</span>{" "}
                    <span data-testid={`conflict-local-${field}`}>{String(local ?? "—")}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Server:</span>{" "}
                    <span data-testid={`conflict-remote-${field}`}>{String(remote ?? "—")}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={() => onResolve("remote")}>
              Use server value
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={() => onResolve("local")}>Keep my change</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


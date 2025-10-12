import { formatDistanceToNow } from "date-fns";

import type { ProcessQueueResult, BoardSyncMutation } from "@/services/offline";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
  queue: BoardSyncMutation[];
  skipped?: ProcessQueueResult["skipped"];
  appliedRemote?: ProcessQueueResult["appliedRemote"];
  backoff: { attempt: number; nextRun: number | null };
  onRetry: (id?: string) => void;
  onSkip: (id: string) => void;
  onRetryAll: () => void;
  isProcessing: boolean;
}

function renderStatusBadge(status: BoardSyncMutation["status"]) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "syncing":
      return <Badge variant="default">Syncing</Badge>;
    case "conflict":
      return <Badge variant="destructive">Conflict</Badge>;
    case "synced":
      return <Badge variant="outline">Synced</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return null;
  }
}

function formatNextRun(nextRun: number | null) {
  if (!nextRun) return "Awaiting trigger";
  return formatDistanceToNow(new Date(nextRun), { addSuffix: true });
}

export function QueueDrawer({
  open,
  onClose,
  queue,
  skipped = [],
  appliedRemote = [],
  backoff,
  onRetry,
  onSkip,
  onRetryAll,
  isProcessing,
}: QueueDrawerProps) {
  const hasItems = queue.length > 0;

  return (
    <Drawer open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
      <DrawerContent className="bg-background">
        <DrawerHeader>
          <DrawerTitle>Offline queue</DrawerTitle>
          <DrawerDescription>
            Manage pending updates while you are offline or waiting on dependencies.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-4">
          <div className="rounded-md border border-border p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Background replay</p>
              <p className="text-xs text-muted-foreground">
                Attempt {backoff.attempt} • Next run: {formatNextRun(backoff.nextRun)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onRetry()} disabled={isProcessing}>
                Retry now
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onRetryAll()} disabled={isProcessing}>
                Reset backoff
              </Button>
            </div>
          </div>

          {appliedRemote.length > 0 ? (
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">Applied remote updates</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {appliedRemote.map((entry) => (
                  <li key={entry.mutation.id}>{entry.mutation.payload.type} merged from server</li>
                ))}
              </ul>
            </div>
          ) : null}

          {skipped.length > 0 ? (
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">Waiting on dependencies</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {skipped.length} change(s) paused until prerequisites finish syncing.
              </p>
            </div>
          ) : null}

          <ScrollArea className="max-h-[50vh] rounded-md border border-border">
            <div className="divide-y">
              {hasItems ? (
                queue.map((mutation) => (
                  <div key={mutation.id} className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium capitalize">{mutation.payload.type}</p>
                        <p className="text-xs text-muted-foreground">
                          #{mutation.itemId} • {new Date(mutation.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      {renderStatusBadge(mutation.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onRetry(mutation.id)}
                        disabled={isProcessing}
                      >
                        Retry
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => onSkip(mutation.id)}>
                        Skip
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-sm text-muted-foreground">No queued changes</div>
              )}
            </div>
          </ScrollArea>
        </div>
        <DrawerFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

import { formatDistanceToNow } from "date-fns";
import { Network, RefreshCw, Trash2 } from "lucide-react";

import type { OfflineOperationSummary } from "@/services/offline";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileQueueDrawerProps {
  open: boolean;
  onClose: () => void;
  operations: OfflineOperationSummary[];
  onRetryAll?: () => void;
  onRefresh?: () => void;
  onClearSynced?: () => Promise<void> | void;
  isOffline?: boolean;
}

function statusBadge(status: OfflineOperationSummary["status"]) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "syncing":
      return <Badge variant="default">Syncing</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "conflict":
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Conflict</Badge>;
    default:
      return <Badge variant="outline">Synced</Badge>;
  }
}

export function MobileQueueDrawer({
  open,
  onClose,
  operations,
  onRetryAll,
  onRefresh,
  onClearSynced,
  isOffline = false,
}: MobileQueueDrawerProps) {
  const hasOperations = operations.length > 0;

  return (
    <Drawer open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DrawerContent className="bg-background">
        <DrawerHeader>
          <DrawerTitle>Offline queue</DrawerTitle>
          <DrawerDescription>
            Inspect queued changes waiting to sync while offline or when background sync is paused.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Network className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{operations.length} operation(s) queued</p>
                <p className="text-xs">
                  {isOffline
                    ? "Offline mode: queued changes will replay automatically when you reconnect."
                    : "Tap an entry to view metadata and sequence ordering."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRefresh}
                  className="gap-1"
                  disabled={isOffline}
                >
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
              ) : null}
              {onRetryAll ? (
                <Button size="sm" onClick={onRetryAll} className="gap-1" disabled={isOffline}>
                  <Network className="h-4 w-4" /> Retry all
                </Button>
              ) : null}
            </div>
          </div>
          <ScrollArea className="max-h-[55vh] rounded-lg border border-border/60">
            <div className="divide-y">
              {hasOperations ? (
                operations.map((operation) => (
                  <article key={operation.id} className="flex flex-col gap-2 p-4" data-source={operation.source}>
                    <header className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {operation.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(operation.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      {statusBadge(operation.status)}
                    </header>
                    {operation.metadata ? (
                      <div className="rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground">
                        {Object.entries(operation.metadata).map(([key, value]) => (
                          <div key={key} className="flex items-start justify-between gap-2">
                            <span className="uppercase tracking-wide text-[10px] text-muted-foreground/70">{key}</span>
                            <span className="break-all text-right">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">No queued changes 🎉</div>
              )}
            </div>
          </ScrollArea>
        </div>
        <DrawerFooter>
          {onClearSynced ? (
            <Button variant="ghost" onClick={() => void onClearSynced?.()} className="justify-start gap-2 text-sm text-muted-foreground">
              <Trash2 className="h-4 w-4" /> Clear synced records
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

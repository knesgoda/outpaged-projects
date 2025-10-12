import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCopy, RefreshCcw, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import {
  clearOfflineStorage,
  resetOfflineOperation,
  summarizeOfflineQueue,
} from "@/services/offline";
import { useOfflinePolicyContext } from "@/components/offline/OfflinePolicyProvider";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  syncing: "secondary",
  conflict: "destructive",
  failed: "destructive",
  synced: "default",
};

export function SyncDiagnosticsPanel() {
  const { toast } = useToast();
  const connectivity = useConnectivityStatus(0);
  const { policy, refresh: refreshPolicy } = useOfflinePolicyContext();
  const [isWorking, setIsWorking] = useState(false);

  const operations = connectivity.summary?.operations ?? [];
  const failedOperations = useMemo(
    () => operations.filter((operation) => operation.status === "failed"),
    [operations]
  );
  const conflictOperations = useMemo(
    () => operations.filter((operation) => operation.status === "conflict"),
    [operations]
  );

  const handleRefresh = useCallback(async () => {
    setIsWorking(true);
    try {
      await connectivity.refresh();
      await refreshPolicy();
    } finally {
      setIsWorking(false);
    }
  }, [connectivity, refreshPolicy]);

  const handleRetry = useCallback(async () => {
    if (!failedOperations.length) return;
    setIsWorking(true);
    try {
      for (const operation of failedOperations) {
        await resetOfflineOperation(operation.id, operation.source);
      }
      await connectivity.refresh();
      toast({
        title: "Retry queued",
        description: `${failedOperations.length} operation${failedOperations.length === 1 ? "" : "s"} reset to pending`,
      });
    } catch (error) {
      toast({
        title: "Retry failed",
        description: error instanceof Error ? error.message : "Unable to reset failed operations",
        variant: "destructive",
      });
    } finally {
      setIsWorking(false);
    }
  }, [connectivity, failedOperations, toast]);

  const handleClear = useCallback(async () => {
    setIsWorking(true);
    try {
      await clearOfflineStorage();
      await connectivity.refresh();
      toast({
        title: "Offline cache cleared",
        description: "Local queues and snapshots removed",
      });
    } catch (error) {
      toast({
        title: "Clear failed",
        description: error instanceof Error ? error.message : "Unable to clear offline cache",
        variant: "destructive",
      });
    } finally {
      setIsWorking(false);
    }
  }, [connectivity, toast]);

  const handleCopy = useCallback(async () => {
    try {
      const latestSummary = await summarizeOfflineQueue();
      const payload = {
        generatedAt: new Date().toISOString(),
        policy,
        summary: latestSummary,
      };
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast({ title: "Diagnostics copied", description: "Queue state copied to clipboard" });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : "Unable to copy diagnostics",
        variant: "destructive",
      });
    }
  }, [policy, toast]);

  const statusEntries = useMemo(() => Object.entries(connectivity.summary?.byStatus ?? {}), [connectivity.summary]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Sync diagnostics</CardTitle>
          <p className="text-sm text-muted-foreground">
            Monitor offline queues, retry failed operations, and inspect logs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={isWorking}>
            <ClipboardCopy className="mr-2 h-4 w-4" /> Copy logs
          </Button>
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={isWorking}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isWorking ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Total queued</p>
            <p className="text-2xl font-semibold">{connectivity.summary?.total ?? 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Latest activity</p>
            <p className="text-lg font-medium">
              {connectivity.summary?.latestActivity
                ? new Date(connectivity.summary.latestActivity).toLocaleString()
                : "—"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Policy</p>
            <p className="text-sm">{policy.enabled ? "Offline enabled" : "Offline disabled"}</p>
            <p className="text-xs text-muted-foreground">
              Cache limit {policy.cacheLimitMb} MB • Retention {policy.retentionHours} hrs
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Status breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {statusEntries.map(([status, count]) => (
              <Badge key={status} variant={STATUS_VARIANTS[status] ?? "outline"} className="capitalize">
                {status}: {count}
              </Badge>
            ))}
            {statusEntries.length === 0 && <p className="text-sm text-muted-foreground">No queued operations</p>}
          </div>
        </div>

        {(failedOperations.length > 0 || conflictOperations.length > 0) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-semibold">Attention required</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {failedOperations.length} failed • {conflictOperations.length} conflicts
            </p>
          </div>
        )}

        <ScrollArea className="h-48 rounded-md border">
          <div className="divide-y">
            {operations.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No queued operations.</div>
            )}
            {operations.map((operation) => (
              <div key={operation.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[operation.status] ?? "outline"} className="capitalize">
                      {operation.status}
                    </Badge>
                    <span className="font-medium">{operation.description}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {operation.metadata ? JSON.stringify(operation.metadata) : "No metadata"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(operation.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Remote wipe target: {policy.remoteWipe.target ?? "all"}
          {policy.remoteWipe.active && policy.remoteWipe.issuedAt ? (
            <>
              {" "}• Issued {new Date(policy.remoteWipe.issuedAt).toLocaleString()}
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isWorking || failedOperations.length === 0}
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Retry failed
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isWorking || operations.length === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Clear queue
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

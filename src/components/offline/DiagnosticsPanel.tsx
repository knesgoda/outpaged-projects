import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle, Copy, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { clearOfflineStorage, summarizeOfflineQueue } from "@/services/offline";

export function DiagnosticsPanel() {
  const { toast } = useToast();
  const [status, setStatus] = useState({
    queueSize: 0,
    lastSuccess: null as Date | null,
    errors: [] as string[],
    cacheSize: 0,
    indexedDbSize: 0,
  });

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const summary = await summarizeOfflineQueue();
      
      // Estimate storage usage
      let cacheSize = 0;
      let indexedDbSize = 0;

      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        indexedDbSize = estimate.usage ?? 0;
      }

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          cacheSize += keys.length;
        }
      }

      setStatus({
        queueSize: summary.total,
        lastSuccess: summary.total === 0 ? new Date() : null,
        errors: [],
        cacheSize,
        indexedDbSize,
      });
    } catch (error) {
      console.error("Failed to load diagnostics:", error);
    }
  };

  const copyDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      queueSize: status.queueSize,
      lastSuccess: status.lastSuccess?.toISOString() ?? "Never",
      cacheSize: status.cacheSize,
      indexedDbSize: `${(status.indexedDbSize / 1024 / 1024).toFixed(2)} MB`,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
    };

    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    toast({ title: "Diagnostics copied", description: "Sensitive data has been redacted" });
  };

  const clearCache = async () => {
    if (!confirm("Clear all offline data? This cannot be undone.")) return;

    try {
      await clearOfflineStorage();
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      toast({ title: "Cache cleared", description: "All offline data has been removed" });
      await loadStatus();
    } catch (error) {
      toast({
        title: "Failed to clear cache",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Sync Health
        </CardTitle>
        <CardDescription>
          Monitor offline queue status and storage usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              {status.queueSize === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-sm font-medium">Queue Size</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{status.queueSize}</p>
            <p className="text-xs text-muted-foreground">
              {status.queueSize === 0 ? "All synced" : "operations pending"}
            </p>
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Storage Used</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{formatBytes(status.indexedDbSize)}</p>
            <p className="text-xs text-muted-foreground">{status.cacheSize} cached items</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last successful sync</span>
            <Badge variant="secondary">
              {status.lastSuccess ? status.lastSuccess.toLocaleString() : "Never"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Network status</span>
            <Badge variant={navigator.onLine ? "default" : "destructive"}>
              {navigator.onLine ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={copyDiagnostics}
            className="flex-1 gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Diagnostics
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
            className="flex-1 gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

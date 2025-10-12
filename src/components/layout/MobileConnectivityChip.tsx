import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useConnectivityStatus, type ConnectivityStatus } from "@/hooks/useConnectivityStatus";

interface MobileConnectivityChipProps {
  onOpenQueue?: () => void;
  className?: string;
  status?: ConnectivityStatus;
}

function renderIcon(state: ConnectivityStatus["state"]) {
  switch (state) {
    case "offline":
      return <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />;
    case "syncing":
      return <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />;
    default:
      return <Wifi className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

function describeState(state: ConnectivityStatus["state"], queueSize: number) {
  if (state === "offline") return "Offline";
  if (state === "syncing") return "Syncing";
  if (state === "queue" && queueSize > 0) return `Queue ${queueSize}`;
  return "Online";
}

export function MobileConnectivityChip({ onOpenQueue, className, status: statusProp }: MobileConnectivityChipProps) {
  const fallbackStatus = useConnectivityStatus();
  const status = statusProp ?? fallbackStatus;
  const label = describeState(status.state, status.queueSize);

  const lastSyncLabel = status.lastSyncedAt
    ? formatDistanceToNow(status.lastSyncedAt, { addSuffix: true })
    : "Never";

  const isActionable = status.queueSize > 0 && typeof onOpenQueue === "function";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-full border border-border/70 bg-background/95 px-3 py-1 text-xs shadow-sm",
        status.state === "offline" ? "border-destructive/60 text-destructive" : "text-muted-foreground",
        className
      )}
    >
      <span className="flex items-center gap-2">
        <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted", status.state === "offline" && "bg-destructive/10 text-destructive")}>{
          renderIcon(status.state)
        }</span>
        <span className="flex flex-col leading-tight">
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-[11px] text-muted-foreground">
            {status.state === "offline" ? "Changes will sync when back online" : `Last sync ${lastSyncLabel}`}
          </span>
        </span>
      </span>
      <div className="flex items-center gap-2">
        {status.queueSize > 0 ? (
          <Badge variant={status.state === "offline" ? "destructive" : "secondary"} className="font-medium">
            {status.queueSize} queued
          </Badge>
        ) : null}
        {isActionable ? (
          <Button size="sm" variant="outline" onClick={onOpenQueue} className="h-7 px-2 text-xs">
            Manage
          </Button>
        ) : null}
      </div>
    </div>
  );
}

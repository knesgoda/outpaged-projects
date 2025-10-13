import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MobileTopbar } from "./MobileTopbar";
import { MobileQuickBar } from "./MobileQuickBar";
import { MobileConnectivityChip } from "./MobileConnectivityChip";
import { MobileQueueDrawer } from "./MobileQueueDrawer";
import { PullToRefresh } from "@/components/offline/PullToRefresh";
import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";

interface MobileNavigationShellProps {
  children: ReactNode;
  onToggleSidebar?: () => void;
  onOpenShortcuts?: () => void;
}

export function MobileNavigationShell({ children, onToggleSidebar, onOpenShortcuts }: MobileNavigationShellProps) {
  const status = useConnectivityStatus(10_000);
  const [queueOpen, setQueueOpen] = useState(false);

  const operations = status.summary?.operations ?? [];

  const retryAll = useCallback(async () => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      registration?.active?.postMessage({ type: "REPLAY_QUEUED_REQUESTS" });
    } catch (error) {
      console.warn("Failed to trigger background sync replay", error);
    } finally {
      await status.refresh();
    }
  }, [status]);

  const showQueueChip = useMemo(() => status.queueSize > 0 || status.state !== "online", [status.queueSize, status.state]);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <PullToRefresh onRefresh={status.refresh} disabled={status.state === "syncing"} />
      <MobileTopbar
        onToggleSidebar={onToggleSidebar}
        onOpenShortcuts={onOpenShortcuts}
        onNavigate={() => setQueueOpen(false)}
      />
      <div className="px-4 pt-2">
        {showQueueChip ? (
          <MobileConnectivityChip status={status} onOpenQueue={() => setQueueOpen(true)} />
        ) : null}
      </div>
      <main className="relative flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8">{children}</div>
      </main>
      <MobileQuickBar onNavigate={() => setQueueOpen(false)} />
      <MobileQueueDrawer
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        operations={operations}
        onRetryAll={operations.length ? retryAll : undefined}
        onRefresh={status.refresh}
        isOffline={status.state === "offline"}
      />
    </div>
  );
}

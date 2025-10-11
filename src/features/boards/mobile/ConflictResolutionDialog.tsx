import { Fragment, useMemo } from "react";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { ProcessQueueResult } from "@/services/offline";

interface ConflictResolutionDialogProps {
  conflict: ProcessQueueResult["conflicts"][number] | null;
  open: boolean;
  onResolve: (resolution: "local" | "remote") => void;
}

export function ConflictResolutionDialog({ conflict, open, onResolve }: ConflictResolutionDialogProps) {
  const diff = useMemo(() => {
    if (!conflict) return [] as { field: string; local: unknown; remote: unknown }[];

    const payload = conflict.mutation.payload;
    const localChanges = payload.changes ?? {};
    const remoteRecord = conflict.remote ?? {};

    const keys = new Set<string>();
    Object.keys(localChanges).forEach((key) => keys.add(key));
    Object.keys(remoteRecord).forEach((key) => keys.add(key));

    if (payload.type === "move" && payload.field) {
      keys.add(payload.field);
    }

    return Array.from(keys).map((field) => {
      if (payload.type === "move" && payload.field === field) {
        return { field, local: payload.to, remote: remoteRecord[field] };
      }
      return { field, local: (localChanges as Record<string, unknown>)[field], remote: remoteRecord[field] };
    });
  }, [conflict]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent data-testid="mobile-conflict-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Resolve sync conflict</AlertDialogTitle>
          <AlertDialogDescription>
            We detected changes on the server that conflict with your offline edits. Choose which version to keep.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          {diff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No field-level differences detected.</p>
          ) : (
            diff.map(({ field, local, remote }) => (
              <Fragment key={field}>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{field}</span>
                    <Badge variant="outline">conflict</Badge>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm">
                    <div>
                      <span className="font-semibold">Offline:</span>{" "}
                      <span data-testid={`conflict-local-${field}`}>{String(local ?? "—")}</span>
                    </div>
                    <div>
                      <span className="font-semibold">Server:</span>{" "}
                      <span data-testid={`conflict-remote-${field}`}>{String(remote ?? "—")}</span>
                    </div>
                  </div>
                </div>
              </Fragment>
            ))
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={() => onResolve("remote")}>Use server</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={() => onResolve("local")}>Keep offline change</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

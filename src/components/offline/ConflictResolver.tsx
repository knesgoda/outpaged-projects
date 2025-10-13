import { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

export interface FieldConflict {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  lastModifiedLocal: string;
  lastModifiedRemote: string;
}

export interface ConflictRecord {
  id: string;
  entityType: string;
  entityId: string;
  conflicts: FieldConflict[];
}

interface ConflictResolverProps {
  open: boolean;
  onClose: () => void;
  conflict: ConflictRecord | null;
  onResolve: (resolution: Record<string, "local" | "remote">) => Promise<void>;
}

export function ConflictResolver({ open, onClose, conflict, onResolve }: ConflictResolverProps) {
  const [selections, setSelections] = useState<Record<string, "local" | "remote">>({});
  const [isResolving, setIsResolving] = useState(false);

  if (!conflict) return null;

  const handleSelect = (field: string, choice: "local" | "remote") => {
    setSelections((prev) => ({ ...prev, [field]: choice }));
  };

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await onResolve(selections);
      onClose();
      setSelections({});
    } finally {
      setIsResolving(false);
    }
  };

  const allResolved = conflict.conflicts.every((c) => selections[c.field]);

  return (
    <Drawer open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DrawerContent className="bg-background">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Sync Conflict
          </DrawerTitle>
          <DrawerDescription>
            This {conflict.entityType} was edited both offline and online. Choose which version to keep for each field.
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="max-h-[60vh] px-4">
          <div className="space-y-4 pb-4">
            {conflict.conflicts.map((fieldConflict) => {
              const selected = selections[fieldConflict.field];
              return (
                <div
                  key={fieldConflict.field}
                  className="rounded-lg border border-border bg-muted/30 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {fieldConflict.field}
                    </span>
                    {selected && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" /> {selected === "local" ? "Yours" : "Theirs"}
                      </Badge>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleSelect(fieldConflict.field, "local")}
                      className={cn(
                        "flex flex-col gap-2 rounded-md border p-3 text-left transition-colors",
                        selected === "local"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        Your version (offline)
                      </span>
                      <span className="text-sm text-foreground">
                        {String(fieldConflict.localValue)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {fieldConflict.lastModifiedLocal}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelect(fieldConflict.field, "remote")}
                      className={cn(
                        "flex flex-col gap-2 rounded-md border p-3 text-left transition-colors",
                        selected === "remote"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        Server version (online)
                      </span>
                      <span className="text-sm text-foreground">
                        {String(fieldConflict.remoteValue)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {fieldConflict.lastModifiedRemote}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DrawerFooter>
          <Button
            onClick={handleResolve}
            disabled={!allResolved || isResolving}
            className="w-full"
          >
            {isResolving ? "Resolving..." : "Apply Resolution"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isResolving}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

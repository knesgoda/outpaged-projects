import { useMemo } from "react";
import type React from "react";
import { CheckCircle, MoveRight, RotateCcw } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MobileQuickActionsSheetProps {
  open: boolean;
  item: Record<string, unknown> | null;
  columnLabel?: string;
  onClose: () => void;
  onAction: (action: QuickActionDefinition) => void;
}

export interface QuickActionDefinition {
  id: "complete" | "move-forward" | "reset";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DEFAULT_ACTIONS: QuickActionDefinition[] = [
  {
    id: "complete",
    label: "Mark complete",
    description: "Move to done and close out",
    icon: CheckCircle,
  },
  {
    id: "move-forward",
    label: "Advance to next stage",
    description: "Move the work item forward",
    icon: MoveRight,
  },
  {
    id: "reset",
    label: "Reset status",
    description: "Send back to backlog",
    icon: RotateCcw,
  },
];

export function MobileQuickActionsSheet({
  open,
  item,
  columnLabel,
  onClose,
  onAction,
}: MobileQuickActionsSheetProps) {
  const actions = useMemo(() => DEFAULT_ACTIONS, []);

  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent side="bottom" className="rounded-t-3xl" data-testid="mobile-quick-actions">
        <SheetHeader>
          <SheetTitle>Quick actions</SheetTitle>
          <SheetDescription>
            {item ? (
              <div className="flex items-center gap-2 text-left">
                <span className="truncate text-sm font-medium">{String(item.title ?? item.name ?? item.id)}</span>
                {columnLabel ? <Badge variant="secondary">{columnLabel}</Badge> : null}
              </div>
            ) : (
              <span>Select a card to open quick actions.</span>
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="justify-start gap-3"
                onClick={() => onAction(action)}
                data-testid={`quick-action-${action.id}`}
              >
                <Icon className="h-4 w-4" />
                <div className="flex flex-col text-left">
                  <span className="font-medium">{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.description}</span>
                </div>
              </Button>
            );
          })}
          <Button variant="ghost" onClick={onClose} data-testid="quick-actions-close">
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

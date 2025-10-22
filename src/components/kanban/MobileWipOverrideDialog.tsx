import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import type { Task } from "./TaskCard";

interface SimplifiedOverrideState {
  task: Task;
  reason: "column" | "lane" | null;
  limit: number | null;
  requireReason: boolean;
}

interface MobileWipOverrideDialogProps {
  open: boolean;
  pending: SimplifiedOverrideState | null;
  columnName?: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  canOverride?: boolean;
  permissionMessage?: string;
}

export function MobileWipOverrideDialog({
  open,
  pending,
  columnName,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  canOverride = true,
  permissionMessage,
}: MobileWipOverrideDialogProps) {
  const requiresReason = pending?.requireReason ?? false;
  const disabled = requiresReason ? reason.trim().length === 0 : false;
  const permissionBlocked = !canOverride;

  const description = pending?.reason === "lane"
    ? "The swimlane capacity has been reached."
    : "The column capacity has been reached.";

  return (
    <Drawer open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Override WIP Limit?
          </DrawerTitle>
          <DrawerDescription>
            {columnName ? `${columnName} is currently over capacity.` : "The selected column is over capacity."}
            {pending?.limit ? ` Limit: ${pending.limit}.` : null}
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 pb-4 space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          
          {permissionBlocked && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {permissionMessage ?? "You do not have permission to approve WIP overrides."}
            </div>
          )}
          
          {pending?.requireReason && (
            <div className="space-y-2">
              <Label htmlFor="mobile-override-reason" className="text-sm font-medium">
                Provide a justification
              </Label>
              <Textarea
                id="mobile-override-reason"
                placeholder="Explain why this work should exceed the limit"
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                rows={4}
                className="text-base" // Better for mobile
              />
            </div>
          )}
        </div>
        
        <DrawerFooter className="flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={disabled || permissionBlocked}
            className="flex-1"
          >
            Override Limit
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

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
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "./TaskCard";

interface SimplifiedOverrideState {
  task: Task;
  reason: "column" | "lane" | null;
  limit: number | null;
  requireReason: boolean;
}

interface WipOverrideDialogProps {
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

export function WipOverrideDialog({
  open,
  pending,
  columnName,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
  canOverride = true,
  permissionMessage,
}: WipOverrideDialogProps) {
  const requiresReason = pending?.requireReason ?? false;
  const disabled = requiresReason ? reason.trim().length === 0 : false;
  const permissionBlocked = !canOverride;

  const description = pending?.reason === "lane"
    ? "The swimlane capacity has been reached."
    : "The column capacity has been reached.";

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      if (!next) {
        onCancel();
      }
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Override WIP limit?</AlertDialogTitle>
          <AlertDialogDescription>
            {columnName ? `${columnName} is currently over capacity.` : "The selected column is over capacity."}
            {pending?.limit ? ` Limit: ${pending.limit}.` : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">{description}</p>
          {permissionBlocked ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive" role="alert">
              {permissionMessage ?? "You do not have permission to approve WIP overrides."}
            </p>
          ) : null}
          {pending?.requireReason ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="override-reason">
                Provide a justification
              </label>
              <Textarea
                id="override-reason"
                placeholder="Explain why this work should exceed the limit"
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
              />
            </div>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={disabled || permissionBlocked}
            aria-disabled={disabled || permissionBlocked}
          >
            Override limit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

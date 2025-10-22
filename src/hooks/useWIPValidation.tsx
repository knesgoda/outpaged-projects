import { useState, useCallback } from "react";
import { validateWIPLimit, validateColumnMove } from "@/services/boards/columnService";
import type { WIPValidationResult, ColumnMoveValidation } from "@/types/kanban";
import type { Task } from "@/components/kanban/TaskCard";

interface WIPOverrideState {
  task: Task;
  reason: "column" | "lane" | null;
  limit: number | null;
  requireReason: boolean;
  columnId: string;
  columnName: string;
  onApprove: () => void;
}

export function useWIPValidation() {
  const [pendingOverride, setPendingOverride] = useState<WIPOverrideState | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const validateMove = useCallback(
    async (
      task: Task,
      toColumnId: string,
      columnName: string,
      currentColumnCount: number
    ): Promise<{ allowed: boolean; validation?: ColumnMoveValidation; error?: Error }> => {
      setIsValidating(true);
      try {
        const validation = await validateColumnMove(task.id, toColumnId, currentColumnCount);
        
        if (!validation.allowed) {
          return { allowed: false, validation };
        }

        return { allowed: true, validation };
      } catch (error) {
        console.error("WIP validation error:", error);
        // Allow move on error to prevent blocking, but return the error
        return { allowed: true, error: error as Error };
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  const requestWIPOverride = useCallback(
    (
      task: Task,
      columnId: string,
      columnName: string,
      validation: ColumnMoveValidation,
      onApprove: () => void
    ) => {
      setPendingOverride({
        task,
        reason: "column", // Default to column for now
        limit: null, // Will be shown in dialog from validation
        requireReason: validation.severity === "block",
        columnId,
        columnName,
        onApprove,
      });
      setShowOverrideDialog(true);
    },
    []
  );

  const handleOverrideConfirm = useCallback(() => {
    if (pendingOverride) {
      // In a real implementation, you'd save the override to the database
      console.log("WIP Override granted:", {
        taskId: pendingOverride.task.id,
        columnId: pendingOverride.columnId,
        reason: overrideReason,
      });
      
      pendingOverride.onApprove();
    }
    setShowOverrideDialog(false);
    setPendingOverride(null);
    setOverrideReason("");
  }, [pendingOverride, overrideReason]);

  const handleOverrideCancel = useCallback(() => {
    setShowOverrideDialog(false);
    setPendingOverride(null);
    setOverrideReason("");
  }, []);

  return {
    validateMove,
    requestWIPOverride,
    showOverrideDialog,
    pendingOverride,
    overrideReason,
    setOverrideReason,
    handleOverrideConfirm,
    handleOverrideCancel,
    isValidating,
  };
}

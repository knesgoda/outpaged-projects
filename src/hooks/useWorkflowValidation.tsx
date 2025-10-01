import { useState, useCallback } from "react";
import { Database } from "@/integrations/supabase/types";

type TaskStatus = Database["public"]["Enums"]["task_status"];
import { validateStatusTransition, ValidationResult } from "@/lib/workflowValidation";

export function useWorkflowValidation() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showApprovalGate, setShowApprovalGate] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    taskId: string;
    taskTitle: string;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
    onApprove: () => void;
  } | null>(null);

  const validateTransition = useCallback(
    (
      taskData: any,
      toStatus: TaskStatus,
      projectId: string,
      team?: string
    ): ValidationResult => {
      const result = validateStatusTransition(taskData, toStatus, projectId, team);
      setValidationResult(result);
      return result;
    },
    []
  );

  const checkAndRequestApproval = useCallback(
    (
      taskId: string,
      taskTitle: string,
      fromStatus: TaskStatus,
      toStatus: TaskStatus,
      validation: ValidationResult,
      onApprove: () => void
    ) => {
      if (validation.requiresApproval) {
        setPendingTransition({
          taskId,
          taskTitle,
          fromStatus,
          toStatus,
          onApprove,
        });
        setShowApprovalGate(true);
        return true;
      }
      return false;
    },
    []
  );

  const handleApprovalComplete = useCallback(() => {
    if (pendingTransition) {
      pendingTransition.onApprove();
    }
    setShowApprovalGate(false);
    setPendingTransition(null);
    setValidationResult(null);
  }, [pendingTransition]);

  const handleApprovalReject = useCallback(() => {
    setShowApprovalGate(false);
    setPendingTransition(null);
    setValidationResult(null);
  }, []);

  const resetValidation = useCallback(() => {
    setValidationResult(null);
    setShowApprovalGate(false);
    setPendingTransition(null);
  }, []);

  return {
    validationResult,
    showApprovalGate,
    pendingTransition,
    validateTransition,
    checkAndRequestApproval,
    handleApprovalComplete,
    handleApprovalReject,
    resetValidation,
  };
}

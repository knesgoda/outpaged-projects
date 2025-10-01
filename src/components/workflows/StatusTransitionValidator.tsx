import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ValidationResult } from "@/lib/workflowValidation";

interface StatusTransitionValidatorProps {
  validation: ValidationResult;
  showSuccess?: boolean;
}

export function StatusTransitionValidator({
  validation,
  showSuccess = false,
}: StatusTransitionValidatorProps) {
  if (validation.isValid && !validation.requiresApproval && !showSuccess) {
    return null;
  }

  if (validation.isValid && !validation.requiresApproval && showSuccess) {
    return (
      <Alert className="border-green-500/20 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle>Ready to proceed</AlertTitle>
        <AlertDescription>All requirements met for this transition</AlertDescription>
      </Alert>
    );
  }

  if (!validation.isValid) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Missing Required Fields</AlertTitle>
        <AlertDescription>
          <p className="mb-2">{validation.message}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {validation.missingFields.map((field) => (
              <Badge key={field} variant="destructive">
                {field.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (validation.requiresApproval) {
    return (
      <Alert className="border-yellow-500/20 bg-yellow-500/10">
        <Lock className="h-4 w-4 text-yellow-500" />
        <AlertTitle>Approval Required</AlertTitle>
        <AlertDescription>
          <p className="mb-2">This transition requires approval from:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {validation.approvalRoles.map((role) => (
              <Badge key={role} variant="secondary">
                {role.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

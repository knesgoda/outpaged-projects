import { useMemo } from "react";
import {
  AutomationDesigner,
  automationToDesignerState,
  designerStateToPayload,
  type AutomationDesignerState,
  type AutomationDesignerSubmitPayload,
} from "@/components/automation/AutomationDesigner";
import type { Automation } from "@/types";
import type { ProjectOption } from "@/hooks/useProjectOptions";

export type AutomationFormValues = AutomationDesignerSubmitPayload;

type AutomationFormProps = {
  initial?: Partial<Automation> | null;
  onSubmit: (values: AutomationFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
  projectOptions?: ProjectOption[];
  hideProjectSelect?: boolean;
  defaultProjectId?: string | null;
};

export function AutomationForm({
  initial,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save automation",
  projectOptions = [],
  hideProjectSelect = false,
  defaultProjectId = null,
}: AutomationFormProps) {
  const initialState = useMemo(
    () => automationToDesignerState(initial ?? null, { defaultProjectId }),
    [initial, defaultProjectId]
  );

  const handleSubmit = async (state: AutomationDesignerState) => {
    const payload = designerStateToPayload(state);
    await onSubmit(payload);
  };

  return (
    <AutomationDesigner
      initialState={initialState}
      onSubmit={handleSubmit}
      projectOptions={projectOptions}
      allowProjectSelection={!hideProjectSelect}
      showHistory={false}
      showRecipeLibrary
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
    />
  );
}

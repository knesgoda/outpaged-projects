import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { CustomFieldDefinition } from "@/domain/customFields";
import { upsertCustomFieldDefinition, type UpsertCustomFieldDefinitionParams } from "@/services/customFields";

const FIELD_TYPE_OPTIONS: Array<{ value: CustomFieldDefinition["fieldType"]; label: string }> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "single_select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "date", label: "Date" },
  { value: "date_range", label: "Date range" },
  { value: "story_points", label: "Story points" },
  { value: "time_estimate", label: "Time estimate" },
  { value: "user", label: "User" },
  { value: "team", label: "Team" },
  { value: "url", label: "URL" },
];

interface InlineCustomFieldWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  workspaceId?: string;
  defaultScope?: "project" | "global";
  onCreated?: (definition: CustomFieldDefinition) => void;
}

interface WizardState {
  step: 0 | 1 | 2;
  name: string;
  description: string;
  fieldType: CustomFieldDefinition["fieldType"];
  isRequired: boolean;
  scope: "project" | "global";
  options: Array<{ id: string; label: string }>;
}

const createInitialState = (defaultScope: "project" | "global"): WizardState => ({
  step: 0,
  name: "",
  description: "",
  fieldType: "text",
  isRequired: false,
  scope: defaultScope,
  options: [],
});

export function InlineCustomFieldWizard({
  open,
  onOpenChange,
  projectId,
  workspaceId,
  defaultScope = "project",
  onCreated,
}: InlineCustomFieldWizardProps) {
  const [state, setState] = useState<WizardState>(() => createInitialState(defaultScope));
  const [saving, setSaving] = useState(false);

  const requiresOptions = state.fieldType === "single_select" || state.fieldType === "multi_select";

  const canAdvance = useMemo(() => {
    if (state.step === 0) {
      return state.name.trim().length > 0;
    }
    if (state.step === 1 && requiresOptions) {
      return state.options.length >= 2 && state.options.every((option) => option.label.trim().length > 0);
    }
    return true;
  }, [state, requiresOptions]);

  const handleClose = () => {
    onOpenChange(false);
    setState(createInitialState(defaultScope));
    setSaving(false);
  };

  const handleAddOption = () => {
    setState((prev) => ({
      ...prev,
      options: [...prev.options, { id: crypto.randomUUID(), label: "" }],
    }));
  };

  const handleOptionLabelChange = (id: string, label: string) => {
    setState((prev) => ({
      ...prev,
      options: prev.options.map((option) => (option.id === id ? { ...option, label } : option)),
    }));
  };

  const handleRemoveOption = (id: string) => {
    setState((prev) => ({
      ...prev,
      options: prev.options.filter((option) => option.id !== id),
    }));
  };

  const handleNext = () => {
    if (!canAdvance) {
      return;
    }
    setState((prev) => ({ ...prev, step: (prev.step + 1) as WizardState["step"] }));
  };

  const handleBack = () => {
    setState((prev) => ({ ...prev, step: (prev.step - 1) as WizardState["step"] }));
  };

  const handleSubmit = async () => {
    if (!canAdvance || saving) {
      return;
    }
    if (state.scope === "project" && !projectId) {
      toast.error("Select a project before creating project-scoped fields.");
      return;
    }
    if (state.scope === "global" && !workspaceId) {
      toast.error("Workspace context is required for global fields.");
      return;
    }

    setSaving(true);
    try {
      const payload: UpsertCustomFieldDefinitionParams["definition"] = {
        name: state.name.trim(),
        description: state.description.trim() || undefined,
        fieldType: state.fieldType,
        isRequired: state.isRequired,
        projectId: state.scope === "project" ? projectId : undefined,
        workspaceId: state.scope === "global" ? workspaceId : undefined,
        contexts: ["tasks", "forms"],
      };

      if (requiresOptions) {
        payload.optionSet = {
          id: crypto.randomUUID(),
          options: state.options.map((option) => ({
            id: option.id,
            label: option.label.trim(),
          })),
        };
      }

      const definition = await upsertCustomFieldDefinition({ definition: payload });
      toast.success(`${definition.name} created`);
      onCreated?.(definition);
      handleClose();
    } catch (error: any) {
      console.error("Failed to create custom field", error);
      toast.error(error?.message ?? "Failed to create custom field");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create custom field</DialogTitle>
        </DialogHeader>

        {state.step === 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-field-name">Field name</Label>
              <Input
                id="custom-field-name"
                value={state.name}
                onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Customer impact"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-field-description">Description</Label>
              <Textarea
                id="custom-field-description"
                value={state.description}
                onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Explain how this field is used"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="custom-field-type">Field type</Label>
                <Select
                  value={state.fieldType}
                  onValueChange={(value) =>
                    setState((prev) => ({
                      ...prev,
                      fieldType: value as WizardState["fieldType"],
                      options: [],
                    }))
                  }
                >
                  <SelectTrigger id="custom-field-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-field-scope">Scope</Label>
                <Select
                  value={state.scope}
                  onValueChange={(value) =>
                    setState((prev) => ({
                      ...prev,
                      scope: value as WizardState["scope"],
                    }))
                  }
                >
                  <SelectTrigger id="custom-field-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project" disabled={!projectId}>
                      Project only
                    </SelectItem>
                    <SelectItem value="global" disabled={!workspaceId}>
                      Workspace
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <div className="text-sm font-medium">Mark as required</div>
                <div className="text-xs text-muted-foreground">Users must supply a value before creating a task</div>
              </div>
              <Switch
                checked={state.isRequired}
                onCheckedChange={(checked) => setState((prev) => ({ ...prev, isRequired: checked }))}
                aria-label="Toggle required"
              />
            </div>
          </div>
        ) : null}

        {state.step === 1 && requiresOptions ? (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold">Define options</div>
              <p className="text-xs text-muted-foreground">
                Provide at least two choices. You can edit colors and defaults later in settings.
              </p>
            </div>
            <div className="space-y-2">
              {state.options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  <Input
                    value={option.label}
                    onChange={(event) => handleOptionLabelChange(option.id, event.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  <Button type="button" variant="ghost" onClick={() => handleRemoveOption(option.id)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddOption}>
                Add option
              </Button>
            </div>
          </div>
        ) : null}

        {state.step === 2 || (!requiresOptions && state.step === 1) ? (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold">Review</div>
              <p className="text-xs text-muted-foreground">Confirm the details before creating your field.</p>
            </div>
            <div className="space-y-2 rounded-md border px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{state.name || "–"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">
                  {FIELD_TYPE_OPTIONS.find((option) => option.value === state.fieldType)?.label ?? state.fieldType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scope</span>
                <span className="font-medium">{state.scope === "global" ? "Workspace" : "Project"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required</span>
                <span className="font-medium">{state.isRequired ? "Yes" : "No"}</span>
              </div>
              {requiresOptions ? (
                <div>
                  <div className="text-muted-foreground">Options</div>
                  <ul className="list-inside list-disc">
                    {state.options.map((option) => (
                      <li key={option.id}>{option.label || "–"}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {state.description ? (
                <div>
                  <div className="text-muted-foreground">Description</div>
                  <p>{state.description}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter className="flex w-full justify-between">
          <div className="text-xs text-muted-foreground">
            Step {requiresOptions ? state.step + 1 : Math.min(state.step + 1, 2)} of {requiresOptions ? 3 : 2}
          </div>
          <div className="flex items-center gap-2">
            {state.step > 0 ? (
              <Button type="button" variant="ghost" onClick={handleBack}>
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={state.step === (requiresOptions ? 2 : 1) ? handleSubmit : handleNext}
              disabled={!canAdvance || saving}
            >
              {state.step === (requiresOptions ? 2 : 1) ? (saving ? "Creating…" : "Create field") : "Next"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const __testing__ = {
  createInitialState,
};

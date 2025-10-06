import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Automation } from "@/types";
import type { ProjectOption } from "@/hooks/useProjectsLite";

const TRIGGER_OPTIONS: Automation["trigger_type"][] = [
  "on_task_created",
  "on_task_moved",
  "on_due_soon",
  "schedule_cron",
];

const ACTION_OPTIONS: Automation["action_type"][] = [
  "create_subtask",
  "change_status",
  "send_webhook",
];

type AutomationFormProps = {
  initialValue?: Partial<Automation>;
  projectOptions: ProjectOption[];
  defaultProjectId?: string | null;
  lockProject?: boolean;
  submitLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (payload: {
    name: string;
    enabled: boolean;
    trigger_type: Automation["trigger_type"];
    trigger_config: Record<string, any>;
    action_type: Automation["action_type"];
    action_config: Record<string, any>;
    project_id?: string | null;
  }) => Promise<void> | void;
  onCancel: () => void;
};

export function AutomationForm({
  initialValue,
  projectOptions,
  defaultProjectId,
  lockProject = false,
  submitLabel = "Save",
  isSubmitting = false,
  onSubmit,
  onCancel,
}: AutomationFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [enabled, setEnabled] = useState(initialValue?.enabled ?? true);
  const [projectSelection, setProjectSelection] = useState<string>(
    initialValue?.project_id ?? defaultProjectId ?? "workspace"
  );
  const [triggerType, setTriggerType] = useState<Automation["trigger_type"]>(
    initialValue?.trigger_type ?? "on_task_created"
  );
  const [actionType, setActionType] = useState<Automation["action_type"]>(
    initialValue?.action_type ?? "create_subtask"
  );
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(
    initialValue?.trigger_config ?? {}
  );
  const [actionConfig, setActionConfig] = useState<Record<string, any>>(
    initialValue?.action_config ?? {}
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValue) {
      setName(initialValue.name ?? "");
      setEnabled(initialValue.enabled ?? true);
      setProjectSelection(initialValue.project_id ?? defaultProjectId ?? "workspace");
      setTriggerType(initialValue.trigger_type ?? "on_task_created");
      setActionType(initialValue.action_type ?? "create_subtask");
      setTriggerConfig(initialValue.trigger_config ?? {});
      setActionConfig(initialValue.action_config ?? {});
    }
  }, [initialValue, defaultProjectId]);

  const updateTriggerConfig = (key: string, value: any) => {
    setTriggerConfig((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const updateActionConfig = (key: string, value: any) => {
    setActionConfig((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const validate = () => {
    if (!name.trim()) {
      setFormError("Name is required.");
      return false;
    }

    if (triggerType === "on_due_soon") {
      const dueIn = Number(triggerConfig.due_in_days ?? 0);
      if (!Number.isFinite(dueIn) || dueIn <= 0) {
        setFormError("Due in days must be greater than zero.");
        return false;
      }
    }

    if (triggerType === "schedule_cron") {
      const cron = String(triggerConfig.cron ?? "").trim();
      if (!cron) {
        setFormError("Cron expression is required.");
        return false;
      }
    }

    if (actionType === "create_subtask") {
      const title = String(actionConfig.title_template ?? "").trim();
      if (!title) {
        setFormError("Title template is required for subtask creation.");
        return false;
      }
    }

    if (actionType === "change_status") {
      const status = String(actionConfig.new_status ?? "").trim();
      if (!status) {
        setFormError("New status is required.");
        return false;
      }
    }

    if (actionType === "send_webhook") {
      const url = String(actionConfig.target_url ?? "").trim();
      if (!url) {
        setFormError("Webhook URL is required.");
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const payload = {
      name: name.trim(),
      enabled,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
      project_id:
        projectSelection === "workspace" ? null : (projectSelection as string),
    };

    await onSubmit(payload);
  };

  const triggerFields = () => {
    switch (triggerType) {
      case "on_task_created":
        return (
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="trigger-column">Column ID (optional)</Label>
              <Input
                id="trigger-column"
                value={triggerConfig.column_id ?? ""}
                onChange={(event) => updateTriggerConfig("column_id", event.target.value)}
              />
            </div>
          </div>
        );
      case "on_task_moved":
        return (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="trigger-from">From column</Label>
              <Input
                id="trigger-from"
                value={triggerConfig.from_column_id ?? ""}
                onChange={(event) => updateTriggerConfig("from_column_id", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="trigger-to">To column</Label>
              <Input
                id="trigger-to"
                value={triggerConfig.to_column_id ?? ""}
                onChange={(event) => updateTriggerConfig("to_column_id", event.target.value)}
              />
            </div>
          </div>
        );
      case "on_due_soon":
        return (
          <div className="space-y-1">
            <Label htmlFor="trigger-due">Due in days</Label>
            <Input
              id="trigger-due"
              type="number"
              min={1}
              value={triggerConfig.due_in_days ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                updateTriggerConfig("due_in_days", value ? Number(value) : undefined);
              }}
            />
          </div>
        );
      case "schedule_cron":
        return (
          <div className="space-y-1">
            <Label htmlFor="trigger-cron">Cron schedule</Label>
            <Input
              id="trigger-cron"
              placeholder="0 8 * * 1"
              value={triggerConfig.cron ?? ""}
              onChange={(event) => updateTriggerConfig("cron", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use standard cron syntax to schedule this automation.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const actionFields = () => {
    switch (actionType) {
      case "create_subtask":
        return (
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="action-parent">Parent task ID (optional)</Label>
              <Input
                id="action-parent"
                value={actionConfig.parent_task_id ?? ""}
                onChange={(event) => updateActionConfig("parent_task_id", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="action-title">Title template</Label>
              <Input
                id="action-title"
                value={actionConfig.title_template ?? ""}
                onChange={(event) => updateActionConfig("title_template", event.target.value)}
              />
            </div>
          </div>
        );
      case "change_status":
        return (
          <div className="space-y-1">
            <Label htmlFor="action-status">New status</Label>
            <Input
              id="action-status"
              value={actionConfig.new_status ?? ""}
              onChange={(event) => updateActionConfig("new_status", event.target.value)}
            />
          </div>
        );
      case "send_webhook":
        return (
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="action-url">Target URL</Label>
              <Input
                id="action-url"
                value={actionConfig.target_url ?? ""}
                onChange={(event) => updateActionConfig("target_url", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="action-secret">Secret (optional)</Label>
              <Input
                id="action-secret"
                value={actionConfig.secret ?? ""}
                onChange={(event) => updateActionConfig("secret", event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="action-payload">Payload template</Label>
              <Textarea
                id="action-payload"
                rows={4}
                value={actionConfig.payload_template ?? ""}
                onChange={(event) => updateActionConfig("payload_template", event.target.value)}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="automation-name">Name</Label>
          <Input
            id="automation-name"
            placeholder="Notify when tasks are overdue"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Enabled</Label>
          <div className="flex items-center gap-2 rounded-md border p-3">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">
              {enabled ? "Runs automatically" : "Paused"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Project scope</Label>
        <Select
          value={projectSelection}
          onValueChange={setProjectSelection}
          disabled={lockProject}
        >
          <SelectTrigger className="sm:w-80">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="workspace">Workspace</SelectItem>
            {projectOptions.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name ?? "Untitled project"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Trigger</Label>
            <Select
              value={triggerType}
              onValueChange={(value: Automation["trigger_type"]) => {
                setTriggerType(value);
                setTriggerConfig({});
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {triggerFields()}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select
              value={actionType}
              onValueChange={(value: Automation["action_type"]) => {
                setActionType(value);
                setActionConfig({});
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {actionFields()}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

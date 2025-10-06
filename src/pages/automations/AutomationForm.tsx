import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Automation } from "@/types";
import type { ProjectOption } from "@/hooks/useProjectOptions";

const TRIGGER_TYPES: Automation["trigger_type"][] = [
  "on_task_created",
  "on_task_moved",
  "on_due_soon",
  "schedule_cron",
];

const ACTION_TYPES: Automation["action_type"][] = [
  "create_subtask",
  "change_status",
  "send_webhook",
];

type AutomationFormValues = {
  name: string;
  enabled: boolean;
  project_id?: string | null;
  trigger_type: Automation["trigger_type"];
  trigger_config: Record<string, any>;
  action_type: Automation["action_type"];
  action_config: Record<string, any>;
};

type AutomationFormProps = {
  initial?: Partial<Automation> | null;
  onSubmit: (values: AutomationFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
  projectOptions?: ProjectOption[];
  hideProjectSelect?: boolean;
  defaultProjectId?: string | null;
};

const DEFAULT_TRIGGER_CONFIG: Record<Automation["trigger_type"], Record<string, any>> = {
  on_task_created: { column_id: "" },
  on_task_moved: { from_column_id: "", to_column_id: "" },
  on_due_soon: { due_in_days: 3 },
  schedule_cron: { cron: "0 9 * * 1" },
};

const DEFAULT_ACTION_CONFIG: Record<Automation["action_type"], Record<string, any>> = {
  create_subtask: { parent_task_id: "", title_template: "Follow-up" },
  change_status: { new_status: "done" },
  send_webhook: { target_url: "", secret: "", payload: "{}" },
};

function getInitialTriggerConfig(type: Automation["trigger_type"], value?: any) {
  if (value && typeof value === "object") {
    return { ...DEFAULT_TRIGGER_CONFIG[type], ...value };
  }
  return { ...DEFAULT_TRIGGER_CONFIG[type] };
}

function getInitialActionConfig(type: Automation["action_type"], value?: any) {
  if (value && typeof value === "object") {
    return { ...DEFAULT_ACTION_CONFIG[type], ...value };
  }
  return { ...DEFAULT_ACTION_CONFIG[type] };
}

export type { AutomationFormValues };

export function AutomationForm({
  initial,
  onSubmit,
  isSubmitting,
  submitLabel = "Save automation",
  projectOptions = [],
  hideProjectSelect = false,
  defaultProjectId = null,
}: AutomationFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [projectId, setProjectId] = useState<string | "none">(
    initial?.project_id ?? defaultProjectId ?? "none"
  );
  const initialTriggerType = (initial?.trigger_type as Automation["trigger_type"]) ?? "on_task_created";
  const initialActionType = (initial?.action_type as Automation["action_type"]) ?? "create_subtask";
  const [triggerType, setTriggerType] = useState<Automation["trigger_type"]>(initialTriggerType);
  const [actionType, setActionType] = useState<Automation["action_type"]>(initialActionType);
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(
    getInitialTriggerConfig(initialTriggerType, initial?.trigger_config)
  );
  const [actionConfig, setActionConfig] = useState<Record<string, any>>(
    getInitialActionConfig(initialActionType, initial?.action_config)
  );
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!initial) {
      return;
    }
    setName(initial.name ?? "");
    setEnabled(initial.enabled ?? true);
    setProjectId(initial.project_id ?? defaultProjectId ?? "none");
    setTriggerType(initial.trigger_type ?? "on_task_created");
    setActionType(initial.action_type ?? "create_subtask");
    setTriggerConfig(getInitialTriggerConfig(initial.trigger_type ?? "on_task_created", initial.trigger_config));
    setActionConfig(getInitialActionConfig(initial.action_type ?? "create_subtask", initial.action_config));
  }, [initial, defaultProjectId]);

  useEffect(() => {
    setTriggerConfig(getInitialTriggerConfig(triggerType));
  }, [triggerType]);

  useEffect(() => {
    setActionConfig(getInitialActionConfig(actionType));
  }, [actionType]);

  const projectSelectOptions = useMemo(() => {
    if (hideProjectSelect) {
      return [];
    }
    return projectOptions;
  }, [projectOptions, hideProjectSelect]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const issues: string[] = [];

    const trimmedName = name.trim();
    if (!trimmedName) {
      issues.push("Name is required.");
    }

    const normalizedTriggerConfig = { ...triggerConfig };
    if (triggerType === "on_task_moved") {
      if (!normalizedTriggerConfig.from_column_id) {
        issues.push("From column is required for task moved trigger.");
      }
      if (!normalizedTriggerConfig.to_column_id) {
        issues.push("To column is required for task moved trigger.");
      }
    }

    if (triggerType === "on_due_soon") {
      const days = Number(normalizedTriggerConfig.due_in_days);
      if (!Number.isFinite(days) || days <= 0) {
        issues.push("Due in days must be greater than zero.");
      } else {
        normalizedTriggerConfig.due_in_days = Math.round(days);
      }
    }

    if (triggerType === "schedule_cron") {
      if (!normalizedTriggerConfig.cron || !String(normalizedTriggerConfig.cron).trim()) {
        issues.push("Cron expression is required.");
      }
    }

    const normalizedActionConfig = { ...actionConfig };
    if (actionType === "create_subtask") {
      if (!normalizedActionConfig.parent_task_id) {
        issues.push("Parent task id is required for subtask creation.");
      }
      if (!normalizedActionConfig.title_template) {
        issues.push("Title template is required for subtask creation.");
      }
    }

    if (actionType === "change_status") {
      if (!normalizedActionConfig.new_status) {
        issues.push("New status is required for change status action.");
      }
    }

    if (actionType === "send_webhook") {
      const url = String(normalizedActionConfig.target_url || "").trim();
      if (!url) {
        issues.push("Webhook URL is required.");
      } else {
        normalizedActionConfig.target_url = url;
      }
      if (!normalizedActionConfig.payload) {
        normalizedActionConfig.payload = "{}";
      }
    }

    setErrors(issues);
    if (issues.length > 0) {
      return;
    }

    await onSubmit({
      name: trimmedName,
      enabled,
      project_id: hideProjectSelect ? defaultProjectId : projectId === "none" ? null : projectId,
      trigger_type: triggerType,
      trigger_config: normalizedTriggerConfig,
      action_type: actionType,
      action_config: normalizedActionConfig,
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Notify when tasks move"
            required
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-sm font-medium">Enabled</Label>
            <p className="text-xs text-muted-foreground">Toggle to disable automation.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {!hideProjectSelect ? (
        <div className="space-y-2">
          <Label htmlFor="project">Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="project">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All projects</SelectItem>
              {projectSelectOptions.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name ?? project.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trigger-type">Trigger</Label>
            <Select value={triggerType} onValueChange={(value) => setTriggerType(value as Automation["trigger_type"]) }>
              <SelectTrigger id="trigger-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {triggerType === "on_task_created" ? (
            <div className="space-y-2">
              <Label htmlFor="trigger-column">Column ID (optional)</Label>
              <Input
                id="trigger-column"
                value={triggerConfig.column_id ?? ""}
                onChange={(event) =>
                  setTriggerConfig((config) => ({ ...config, column_id: event.target.value }))
                }
                placeholder="col_123"
              />
            </div>
          ) : null}

          {triggerType === "on_task_moved" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trigger-from">From column</Label>
                <Input
                  id="trigger-from"
                  value={triggerConfig.from_column_id ?? ""}
                  onChange={(event) =>
                    setTriggerConfig((config) => ({ ...config, from_column_id: event.target.value }))
                  }
                  placeholder="backlog"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trigger-to">To column</Label>
                <Input
                  id="trigger-to"
                  value={triggerConfig.to_column_id ?? ""}
                  onChange={(event) =>
                    setTriggerConfig((config) => ({ ...config, to_column_id: event.target.value }))
                  }
                  placeholder="in-progress"
                />
              </div>
            </div>
          ) : null}

          {triggerType === "on_due_soon" ? (
            <div className="space-y-2">
              <Label htmlFor="trigger-due">Due in days</Label>
              <Input
                id="trigger-due"
                type="number"
                min={1}
                value={triggerConfig.due_in_days ?? 3}
                onChange={(event) =>
                  setTriggerConfig((config) => ({ ...config, due_in_days: Number(event.target.value) }))
                }
              />
            </div>
          ) : null}

          {triggerType === "schedule_cron" ? (
            <div className="space-y-2">
              <Label htmlFor="trigger-cron">Cron schedule</Label>
              <Input
                id="trigger-cron"
                value={triggerConfig.cron ?? ""}
                onChange={(event) =>
                  setTriggerConfig((config) => ({ ...config, cron: event.target.value }))
                }
                placeholder="0 9 * * 1"
              />
              <p className="text-xs text-muted-foreground">Use standard cron syntax in UTC.</p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action-type">Action</Label>
            <Select value={actionType} onValueChange={(value) => setActionType(value as Automation["action_type"])}>
              <SelectTrigger id="action-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {actionType === "create_subtask" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="action-parent">Parent task id template</Label>
                <Input
                  id="action-parent"
                  value={actionConfig.parent_task_id ?? ""}
                  onChange={(event) =>
                    setActionConfig((config) => ({ ...config, parent_task_id: event.target.value }))
                  }
                  placeholder="task_123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-title">Subtask title</Label>
                <Input
                  id="action-title"
                  value={actionConfig.title_template ?? ""}
                  onChange={(event) =>
                    setActionConfig((config) => ({ ...config, title_template: event.target.value }))
                  }
                  placeholder="Follow up on {{task.name}}"
                />
              </div>
            </div>
          ) : null}

          {actionType === "change_status" ? (
            <div className="space-y-2">
              <Label htmlFor="action-status">New status</Label>
              <Input
                id="action-status"
                value={actionConfig.new_status ?? ""}
                onChange={(event) =>
                  setActionConfig((config) => ({ ...config, new_status: event.target.value }))
                }
                placeholder="in-progress"
              />
            </div>
          ) : null}

          {actionType === "send_webhook" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="action-url">Webhook URL</Label>
                <Input
                  id="action-url"
                  value={actionConfig.target_url ?? ""}
                  onChange={(event) =>
                    setActionConfig((config) => ({ ...config, target_url: event.target.value }))
                  }
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-secret">Secret (optional)</Label>
                <Input
                  id="action-secret"
                  value={actionConfig.secret ?? ""}
                  onChange={(event) =>
                    setActionConfig((config) => ({ ...config, secret: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-payload">Payload template</Label>
                <Textarea
                  id="action-payload"
                  value={actionConfig.payload ?? ""}
                  onChange={(event) =>
                    setActionConfig((config) => ({ ...config, payload: event.target.value }))
                  }
                  rows={4}
                  placeholder={`{\n  "task_id": "{{task.id}}"\n}`}
                />
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {errors.length > 0 ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

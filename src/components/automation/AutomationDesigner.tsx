import { useEffect, useMemo, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Clock,
  ListChecks,
  Play,
  Plus,
  Trash2,
  Workflow,
} from "lucide-react";
import type { Automation, AutomationRun } from "@/types";
import type { ProjectOption } from "@/hooks/useProjectOptions";
import { getPrebuiltAutomationRecipes } from "@/services/automations/recipes";
import type { AutomationRecipeDefinition } from "@/types";

type DesignerTriggerType = Automation["trigger_type"];
type DesignerActionType = Automation["action_type"];

type FieldSchemaType = "text" | "textarea" | "select" | "number" | "cron" | "multi" | "user" | "url";

type FieldSchema = {
  name: string;
  label: string;
  type: FieldSchemaType;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
};

export type AutomationDesignerCondition = {
  id: string;
  field: string;
  operator: string;
  value: string;
};

export type AutomationDesignerAction = {
  id: string;
  type: DesignerActionType;
  config: Record<string, unknown>;
};

export type AutomationDesignerState = {
  name: string;
  description: string;
  enabled: boolean;
  projectId: string | null;
  triggerType: DesignerTriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: AutomationDesignerCondition[];
  actions: AutomationDesignerAction[];
  selectedRecipe?: string | null;
};

export type AutomationDesignerSubmitPayload = {
  name: string;
  description: string | null;
  enabled: boolean;
  project_id: string | null;
  trigger_type: DesignerTriggerType;
  trigger_config: Record<string, unknown>;
  action_type: DesignerActionType;
  action_config: Record<string, unknown>;
};

type AutomationDesignerProps = {
  initialState?: AutomationDesignerState;
  onSubmit: (state: AutomationDesignerState) => Promise<void> | void;
  onTest?: (state: AutomationDesignerState) => Promise<void> | void;
  projectOptions?: ProjectOption[];
  runs?: AutomationRun[];
  isSubmitting?: boolean;
  isTesting?: boolean;
  allowProjectSelection?: boolean;
  showHistory?: boolean;
  showRecipeLibrary?: boolean;
  headerActions?: React.ReactNode;
  testButtonLabel?: string;
  submitLabel?: string;
};

const DEFAULT_CONDITIONS: AutomationDesignerCondition[] = [];

const CONDITION_FIELDS = [
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee" },
  { value: "label", label: "Label" },
  { value: "project", label: "Project" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "is" },
  { value: "not_equals", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with", label: "starts with" },
];

const TRIGGER_OPTIONS: Array<{ value: DesignerTriggerType; label: string; description: string }> = [
  { value: "task.created", label: "Task created", description: "Runs whenever a task is created." },
  {
    value: "task.updated",
    label: "Task updated",
    description: "Runs when any field on the task changes.",
  },
  {
    value: "task.moved",
    label: "Task moved",
    description: "Runs when a task changes columns or boards.",
  },
  {
    value: "task.status_changed",
    label: "Status changed",
    description: "Runs when the status field is updated.",
  },
  {
    value: "task.due_soon",
    label: "Due date approaching",
    description: "Runs when the task is nearing its due date.",
  },
  {
    value: "task.timer_started",
    label: "Timer started",
    description: "Runs when someone starts a work timer.",
  },
  {
    value: "on_task_created",
    label: "Legacy: created",
    description: "Legacy trigger for created tasks.",
  },
  {
    value: "on_task_moved",
    label: "Legacy: moved",
    description: "Legacy trigger for moved tasks.",
  },
  {
    value: "on_due_soon",
    label: "Legacy: due soon",
    description: "Legacy due soon trigger.",
  },
  {
    value: "schedule_cron",
    label: "Scheduled (cron)",
    description: "Runs on a defined cron schedule.",
  },
];

const TRIGGER_SCHEMAS: Record<DesignerTriggerType, FieldSchema[]> = {
  "task.created": [],
  "task.updated": [
    {
      name: "fields",
      label: "Watch fields",
      type: "multi",
      description: "Comma separated list of fields to monitor (leave blank for all).",
    },
  ],
  "task.moved": [
    { name: "from", label: "From column", type: "text" },
    { name: "to", label: "To column", type: "text" },
  ],
  "task.status_changed": [
    { name: "from", label: "From status", type: "text" },
    { name: "to", label: "To status", type: "text" },
  ],
  "task.due_soon": [
    {
      name: "thresholdHours",
      label: "Trigger when due in (hours)",
      type: "number",
      placeholder: "24",
      description: "Run the automation when the due date is within this many hours.",
    },
  ],
  "task.timer_started": [
    {
      name: "minimumDuration",
      label: "Minimum duration (minutes)",
      type: "number",
      placeholder: "0",
    },
  ],
  on_task_created: [
    { name: "column_id", label: "Column (optional)", type: "text" },
  ],
  on_task_moved: [
    { name: "from_column_id", label: "From column", type: "text" },
    { name: "to_column_id", label: "To column", type: "text" },
  ],
  on_due_soon: [
    {
      name: "due_in_days",
      label: "Due in days",
      type: "number",
      placeholder: "3",
    },
  ],
  schedule_cron: [
    {
      name: "cron",
      label: "Cron expression",
      type: "cron",
      placeholder: "0 9 * * 1",
      description: "Standard cron syntax in UTC.",
    },
  ],
};

const ACTION_DEFINITIONS: Record<DesignerActionType, { label: string; description: string; fields: FieldSchema[] }> = {
  assign: {
    label: "Assign users",
    description: "Assign teammates when the trigger fires.",
    fields: [
      {
        name: "assignees",
        label: "Assignees",
        type: "multi",
        placeholder: "Add user IDs or emails",
      },
      {
        name: "note",
        label: "Internal note",
        type: "textarea",
        placeholder: "Let everyone know why they were assigned",
      },
    ],
  },
  slack: {
    label: "Send Slack message",
    description: "Post to a Slack channel using an incoming webhook.",
    fields: [
      {
        name: "webhookUrl",
        label: "Webhook URL",
        type: "url",
        placeholder: "https://hooks.slack.com/services/...",
        required: true,
      },
      {
        name: "channel",
        label: "Channel",
        type: "text",
        placeholder: "#team-updates",
      },
      {
        name: "message",
        label: "Message template",
        type: "textarea",
        placeholder: "{task.title} moved to {toColumn}",
      },
    ],
  },
  webhook: {
    label: "Call webhook",
    description: "Send an HTTP request to another service.",
    fields: [
      { name: "url", label: "Request URL", type: "url", required: true },
      {
        name: "method",
        label: "HTTP method",
        type: "select",
        options: [
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
        ],
        required: true,
      },
      {
        name: "headers",
        label: "Headers (JSON)",
        type: "textarea",
        placeholder: '{"Authorization":"Bearer ..."}',
      },
      {
        name: "body",
        label: "Body template",
        type: "textarea",
        placeholder: '{"taskId":"{task.id}"}',
      },
    ],
  },
  timer: {
    label: "Start timer",
    description: "Start a work timer or send a reminder after a delay.",
    fields: [
      {
        name: "duration",
        label: "Duration (minutes)",
        type: "number",
        placeholder: "30",
      },
      {
        name: "remindAfter",
        label: "Remind after (minutes)",
        type: "number",
        placeholder: "120",
      },
    ],
  },
  create_subtask: {
    label: "Create subtask",
    description: "Create a follow-up subtask tied to the trigger.",
    fields: [
      { name: "parent_task_id", label: "Parent task ID", type: "text", required: true },
      {
        name: "title_template",
        label: "Subtask title",
        type: "text",
        placeholder: "Follow up on {task.title}",
      },
    ],
  },
  change_status: {
    label: "Change status",
    description: "Move the task to a different status.",
    fields: [
      { name: "new_status", label: "New status", type: "text", required: true },
      {
        name: "comment",
        label: "Comment",
        type: "textarea",
        placeholder: "Updating status via automation",
      },
    ],
  },
  send_webhook: {
    label: "Legacy webhook",
    description: "Existing webhook action type.",
    fields: [
      { name: "target_url", label: "Webhook URL", type: "url", required: true },
      { name: "secret", label: "Secret", type: "text" },
      {
        name: "payload",
        label: "Payload template",
        type: "textarea",
        placeholder: '{"taskId":"{task.id}"}',
      },
    ],
  },
};

const ACTION_OPTIONS = (Object.keys(ACTION_DEFINITIONS) as DesignerActionType[]).map((key) => ({
  value: key,
  label: ACTION_DEFINITIONS[key].label,
}));

const DEFAULT_STATE: AutomationDesignerState = {
  name: "",
  description: "",
  enabled: true,
  projectId: null,
  triggerType: "task.created",
  triggerConfig: {},
  conditions: DEFAULT_CONDITIONS,
  actions: [createActionState("webhook")],
  selectedRecipe: null,
};

function createActionState(type: DesignerActionType): AutomationDesignerAction {
  return {
    id: generateId(),
    type,
    config: buildDefaultActionConfig(type),
  };
}

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `action_${Math.random().toString(36).slice(2, 10)}`;
}

function buildDefaultTriggerConfig(type: DesignerTriggerType, value?: Record<string, unknown>) {
  const schema = TRIGGER_SCHEMAS[type] ?? [];
  const defaults: Record<string, unknown> = {};
  schema.forEach((field) => {
    if (value && value[field.name] !== undefined) {
      defaults[field.name] = value[field.name];
      return;
    }
    if (field.type === "number") {
      defaults[field.name] = field.placeholder ? Number(field.placeholder) : 0;
    } else {
      defaults[field.name] = field.placeholder ?? "";
    }
  });
  return { ...defaults, ...(value ?? {}) };
}

function buildDefaultActionConfig(type: DesignerActionType, value?: Record<string, unknown>) {
  const schema = ACTION_DEFINITIONS[type]?.fields ?? [];
  const defaults: Record<string, unknown> = {};
  schema.forEach((field) => {
    if (value && value[field.name] !== undefined) {
      defaults[field.name] = value[field.name];
      return;
    }
    switch (field.type) {
      case "number":
        defaults[field.name] = field.placeholder ? Number(field.placeholder) : 0;
        break;
      case "multi":
        defaults[field.name] = [] as string[];
        break;
      default:
        defaults[field.name] = field.placeholder ?? "";
        break;
    }
  });
  return { ...defaults, ...(value ?? {}) };
}

function parseConditions(value: unknown): AutomationDesignerCondition[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        id: generateId(),
        field: typeof record.field === "string" ? record.field : CONDITION_FIELDS[0].value,
        operator: typeof record.operator === "string" ? record.operator : CONDITION_OPERATORS[0].value,
        value: typeof record.value === "string" ? record.value : String(record.value ?? ""),
      } satisfies AutomationDesignerCondition;
    })
    .filter((condition): condition is AutomationDesignerCondition => condition !== null);
}

function getDesignerBlock(value: Record<string, unknown> | undefined) {
  if (!value) {
    return undefined;
  }
  const raw = value["designer"];
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return undefined;
}

export function automationToDesignerState(
  automation?: Partial<Automation> | null,
  options: { defaultProjectId?: string | null } = {}
): AutomationDesignerState {
  if (!automation) {
    return {
      ...DEFAULT_STATE,
      projectId: options.defaultProjectId ?? null,
    };
  }

  const triggerConfig = (automation.trigger_config ?? {}) as Record<string, unknown>;
  const actionConfig = (automation.action_config ?? {}) as Record<string, unknown>;
  const triggerDesigner = getDesignerBlock(triggerConfig);
  const actionDesigner = getDesignerBlock(actionConfig);
  const actionSteps = Array.isArray(actionDesigner?.steps)
    ? (actionDesigner?.steps as Array<Record<string, unknown>>)
    : [];
  const derivedConditions = parseConditions(
    triggerDesigner?.conditions ?? triggerConfig["conditions"] ?? actionDesigner?.conditions
  );

  const actions: AutomationDesignerAction[] =
    actionSteps.length > 0
      ? actionSteps.map((step) => {
          const type = (step.type as DesignerActionType) ?? automation.action_type ?? "webhook";
          return {
            id: generateId(),
            type,
            config: buildDefaultActionConfig(type, (step.config as Record<string, unknown>) ?? {}),
          };
        })
      : [
          {
            id: generateId(),
            type: automation.action_type ?? "webhook",
            config: buildDefaultActionConfig(
              (automation.action_type as DesignerActionType) ?? "webhook",
              actionConfig
            ),
          },
        ];

  return {
    name: automation.name ?? "",
    description: automation.description ?? "",
    enabled: automation.enabled ?? true,
    projectId:
      automation.project_id !== undefined
        ? (automation.project_id as string | null)
        : options.defaultProjectId ?? null,
    triggerType: automation.trigger_type ?? "task.created",
    triggerConfig: buildDefaultTriggerConfig(
      (automation.trigger_type as DesignerTriggerType) ?? "task.created",
      triggerConfig
    ),
    conditions: derivedConditions,
    actions,
    selectedRecipe: (triggerDesigner?.recipe as string | undefined) ?? null,
  };
}

export function designerStateToPayload(state: AutomationDesignerState): AutomationDesignerSubmitPayload {
  const trimmedName = state.name.trim();
  if (!trimmedName) {
    throw new Error("Automation name is required");
  }

  const primaryAction = state.actions[0] ?? createActionState("webhook");
  const normalizedConditions = state.conditions.map((condition, index) => ({
    order: index,
    field: condition.field,
    operator: condition.operator,
    value: condition.value,
  }));

  return {
    name: trimmedName,
    description: state.description.trim() ? state.description.trim() : null,
    enabled: state.enabled,
    project_id: state.projectId ?? null,
    trigger_type: state.triggerType,
    trigger_config: {
      ...state.triggerConfig,
      conditions: normalizedConditions,
      designer: {
        recipe: state.selectedRecipe ?? null,
        conditions: normalizedConditions,
      },
    },
    action_type: primaryAction.type,
    action_config: {
      ...primaryAction.config,
      designer: {
        steps: state.actions.map((action, index) => ({
          order: index,
          type: action.type,
          config: action.config,
        })),
      },
    },
  };
}

export function AutomationDesigner({
  initialState,
  onSubmit,
  onTest,
  projectOptions = [],
  runs = [],
  isSubmitting = false,
  isTesting = false,
  allowProjectSelection = true,
  showHistory = true,
  showRecipeLibrary = true,
  headerActions,
  testButtonLabel = "Test run",
  submitLabel = "Save automation",
}: AutomationDesignerProps) {
  const [state, setState] = useState<AutomationDesignerState>(initialState ?? DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState("workflow");
  const recipes = useMemo(() => getPrebuiltAutomationRecipes(), []);

  useEffect(() => {
    if (initialState) {
      setState(initialState);
    } else {
      setState(DEFAULT_STATE);
    }
  }, [initialState]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(state);
  };

  const handleTest = async () => {
    if (!onTest) return;
    await onTest(state);
  };

  const updateTriggerType = (type: DesignerTriggerType) => {
    setState((prev) => ({
      ...prev,
      triggerType: type,
      triggerConfig: buildDefaultTriggerConfig(type),
    }));
  };

  const updateTriggerConfig = (name: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      triggerConfig: { ...prev.triggerConfig, [name]: value },
    }));
  };

  const addCondition = () => {
    setState((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          id: generateId(),
          field: CONDITION_FIELDS[0].value,
          operator: CONDITION_OPERATORS[0].value,
          value: "",
        },
      ],
    }));
  };

  const updateCondition = (id: string, patch: Partial<AutomationDesignerCondition>) => {
    setState((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition) =>
        condition.id === id ? { ...condition, ...patch } : condition
      ),
    }));
  };

  const removeCondition = (id: string) => {
    setState((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((condition) => condition.id !== id),
    }));
  };

  const addAction = (type: DesignerActionType) => {
    setState((prev) => ({
      ...prev,
      actions: [...prev.actions, createActionState(type)],
    }));
  };

  const updateActionType = (id: string, type: DesignerActionType) => {
    setState((prev) => ({
      ...prev,
      actions: prev.actions.map((action) =>
        action.id === id
          ? {
              ...action,
              type,
              config: buildDefaultActionConfig(type),
            }
          : action
      ),
    }));
  };

  const updateActionConfig = (id: string, name: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      actions: prev.actions.map((action) =>
        action.id === id
          ? {
              ...action,
              config: { ...action.config, [name]: value },
            }
          : action
      ),
    }));
  };

  const removeAction = (id: string) => {
    setState((prev) => ({
      ...prev,
      actions: prev.actions.length === 1 ? prev.actions : prev.actions.filter((action) => action.id !== id),
    }));
  };

  const applyRecipe = (recipe: AutomationRecipeDefinition) => {
    const nextActions = recipe.actions.map((action) => ({
      id: generateId(),
      type: (action.type as DesignerActionType) ?? "webhook",
      config: buildDefaultActionConfig((action.type as DesignerActionType) ?? "webhook"),
    }));

    setState((prev) => ({
      ...prev,
      name: prev.name || recipe.name,
      description: prev.description || recipe.description,
      triggerType: (recipe.trigger.type as DesignerTriggerType) ?? prev.triggerType,
      triggerConfig: buildDefaultTriggerConfig(
        (recipe.trigger.type as DesignerTriggerType) ?? prev.triggerType
      ),
      actions: nextActions.length > 0 ? nextActions : prev.actions,
      conditions: [],
      selectedRecipe: recipe.slug,
    }));
  };

  const projectSelect = allowProjectSelection ? (
    <div className="space-y-2">
      <Label htmlFor="project">Project scope</Label>
      <Select
        value={state.projectId ?? "all"}
        onValueChange={(value) =>
          setState((prev) => ({ ...prev, projectId: value === "all" ? null : value }))
        }
      >
        <SelectTrigger id="project">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projectOptions.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name ?? project.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Automations scoped to a project only listen to events from that project.
      </p>
    </div>
  ) : null;

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Automation designer</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure triggers, conditions, and actions in one place.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Enabled</span>
              <Switch
                checked={state.enabled}
                onCheckedChange={(value) => setState((prev) => ({ ...prev, enabled: value }))}
              />
              {onTest ? (
                <Button type="button" variant="secondary" disabled={isTesting} onClick={handleTest}>
                  {isTesting ? "Testing" : testButtonLabel}
                </Button>
              ) : null}
              {headerActions}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="automation-name">Name</Label>
              <Input
                id="automation-name"
                value={state.name}
                onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Notify channel when work moves"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-description">Description</Label>
              <Textarea
                id="automation-description"
                value={state.description}
                onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Share context with teammates about what this automation handles"
                rows={3}
              />
            </div>
          </div>
          {projectSelect}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Workflow className="h-4 w-4" /> Workflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="workflow">Trigger</TabsTrigger>
                  <TabsTrigger value="conditions">Conditions</TabsTrigger>
                  <TabsTrigger value="actions">Actions</TabsTrigger>
                </TabsList>
                <TabsContent value="workflow" className="space-y-6 pt-6">
                  <section className="space-y-4">
                    <div className="space-y-2">
                      <Label>Trigger type</Label>
                      <Select value={state.triggerType} onValueChange={(value) => updateTriggerType(value as DesignerTriggerType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {TRIGGER_OPTIONS.find((option) => option.value === state.triggerType)?.description}
                    </p>
                    <Separator className="my-4" />
                    <div className="grid gap-4 md:grid-cols-2">
                      {(TRIGGER_SCHEMAS[state.triggerType] ?? []).map((field) => (
                        <TriggerFieldInput
                          key={field.name}
                          field={field}
                          value={state.triggerConfig[field.name]}
                          onChange={(value) => updateTriggerConfig(field.name, value)}
                        />
                      ))}
                      {TRIGGER_SCHEMAS[state.triggerType]?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No additional configuration required for this trigger.
                        </p>
                      ) : null}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="conditions" className="space-y-6 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium">Conditions</h3>
                      <p className="text-sm text-muted-foreground">
                        Refine when this automation should run by filtering on project data.
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addCondition}>
                      <Plus className="mr-1 h-4 w-4" /> Add condition
                    </Button>
                  </div>
                  {state.conditions.length === 0 ? (
                    <p className="rounded-md border border-dashed border-muted-foreground/20 p-6 text-sm text-muted-foreground">
                      No conditions defined. The automation will run for every event that matches the trigger.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {state.conditions.map((condition) => (
                        <div key={condition.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                          <Select
                            value={condition.field}
                            onValueChange={(value) => updateCondition(condition.id, { field: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITION_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITION_OPERATORS.map((operator) => (
                                <SelectItem key={operator.value} value={operator.value}>
                                  {operator.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={condition.value}
                            onChange={(event) => updateCondition(condition.id, { value: event.target.value })}
                            placeholder="Value"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCondition(condition.id)}
                            aria-label="Remove condition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-6 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium">Actions</h3>
                      <p className="text-sm text-muted-foreground">
                        Define the steps to take when the trigger and conditions are satisfied.
                      </p>
                    </div>
                    <Select onValueChange={(value) => addAction(value as DesignerActionType)}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Add action" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    {state.actions.map((action, index) => {
                      const actionDefinition = ACTION_DEFINITIONS[action.type];
                      return (
                        <Card key={action.id} className="border-muted">
                          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                              <Badge variant="outline">Step {index + 1}</Badge>
                              <Select
                                value={action.type}
                                onValueChange={(value) => updateActionType(action.id, value as DesignerActionType)}
                              >
                                <SelectTrigger className="w-[220px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACTION_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-sm text-muted-foreground">
                                {actionDefinition?.description ?? "Configure what should happen next."}
                              </p>
                            </div>
                            {state.actions.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAction(action.id)}
                                aria-label="Remove action"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </CardHeader>
                          <CardContent className="grid gap-4 md:grid-cols-2">
                            {(actionDefinition?.fields ?? []).map((field) => (
                              <ActionFieldInput
                                key={field.name}
                                field={field}
                                value={action.config[field.name]}
                                onChange={(value) => updateActionConfig(action.id, field.name, value)}
                              />
                            ))}
                            {(actionDefinition?.fields ?? []).length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No configuration required for this action.
                              </p>
                            ) : null}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {showHistory ? (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Clock className="h-4 w-4" />
                <CardTitle className="text-base font-semibold">Execution history</CardTitle>
              </CardHeader>
              <CardContent>
                {runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
                ) : (
                  <ScrollArea className="max-h-72 pr-4">
                    <ul className="space-y-3 text-sm">
                      {runs.map((run) => (
                        <li key={run.id} className="flex items-start justify-between gap-3">
                          <div className="flex flex-col">
                            <Badge variant={run.status === "success" ? "default" : "outline"} className="w-fit">
                              {run.status}
                            </Badge>
                            <span className="text-muted-foreground">{run.message ?? "—"}</span>
                          </div>
                          <time className="text-xs text-muted-foreground">
                            {new Date(run.created_at).toLocaleString()}
                          </time>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-6">
          {showRecipeLibrary ? (
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <CardTitle className="text-base font-semibold">Recipe library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Apply a starter recipe to jumpstart your automation and tweak it afterwards.
                </p>
                <ScrollArea className="h-80 pr-4">
                  <div className="space-y-4">
                    {recipes.map((recipe) => (
                      <div
                        key={recipe.slug}
                        className="space-y-3 rounded-lg border border-muted p-4 transition hover:border-primary"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-medium leading-tight">{recipe.name}</h3>
                            <p className="text-xs text-muted-foreground">{recipe.description}</p>
                          </div>
                          {state.selectedRecipe === recipe.slug ? (
                            <Badge variant="secondary">Applied</Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{recipe.trigger.label}</Badge>
                          <span>•</span>
                          <span>{recipe.actions.length} action(s)</span>
                        </div>
                        <Button type="button" size="sm" onClick={() => applyRecipe(recipe)}>
                          Use this recipe
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <ListChecks className="h-4 w-4" />
              <CardTitle className="text-base font-semibold">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Trigger</p>
                <p className="text-muted-foreground">
                  {TRIGGER_OPTIONS.find((option) => option.value === state.triggerType)?.label ?? state.triggerType}
                </p>
              </div>
              <div>
                <p className="font-medium">Conditions</p>
                <p className="text-muted-foreground">
                  {state.conditions.length > 0
                    ? `${state.conditions.length} condition${state.conditions.length === 1 ? "" : "s"}`
                    : "Runs for every matching trigger"}
                </p>
              </div>
              <div>
                <p className="font-medium">Actions</p>
                <ul className="space-y-1 text-muted-foreground">
                  {state.actions.map((action) => (
                    <li key={action.id}>{ACTION_DEFINITIONS[action.type]?.label ?? action.type}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Card>
        <CardFooter className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving" : submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

type FieldInputProps = {
  field: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
};

function TriggerFieldInput({ field, value, onChange }: FieldInputProps) {
  return <FieldInput field={field} value={value} onChange={onChange} />;
}

function ActionFieldInput({ field, value, onChange }: FieldInputProps) {
  return <FieldInput field={field} value={value} onChange={onChange} />;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Textarea
            value={typeof value === "string" ? value : String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
          {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
        </div>
      );
    case "select":
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Select value={String(value ?? "")} onValueChange={(next) => onChange(next)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
        </div>
      );
    case "number":
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            type="number"
            value={Number(value ?? 0)}
            onChange={(event) => onChange(Number(event.target.value))}
            placeholder={field.placeholder}
          />
          {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
        </div>
      );
    case "multi":
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            value={Array.isArray(value) ? (value as string[]).join(", ") : String(value ?? "")}
            onChange={(event) => onChange(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
            placeholder={field.placeholder}
          />
          {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
        </div>
      );
    default:
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <Input
            value={typeof value === "string" ? value : String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
          />
          {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
        </div>
      );
  }
}


// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Paperclip, Link as LinkIcon, User, Clock, Zap, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InlineCustomFieldWizard } from "./InlineCustomFieldWizard";
import AssigneeCompanySelect from "@/components/tasks/AssigneeCompanySelect";
import RelationshipPicker from "@/components/tasks/RelationshipPicker";
import { useAuth } from "@/hooks/useAuth";
import { useCustomFieldDefinitions, useVisibleCustomFields } from "@/hooks/useCustomFields";
import { isComputedField } from "@/domain/customFields";
import { upsertTaskCustomFieldValues } from "@/services/customFields";
import { uploadTaskAttachment } from "@/services/storage";

interface TemplateSummary {
  id: string;
  name: string;
  description?: string | null;
  template_data?: Record<string, unknown> | null;
  scope: "project" | "workspace";
}

interface CustomFieldValueMap {
  [fieldId: string]: unknown;
}

interface EnhancedTaskCreatorProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated?: (taskId: string) => void;
  workspaceId?: string;
}

interface FormState {
  title: string;
  description: string;
  taskType: "task" | "story" | "bug" | "subtask";
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "in_review" | "done";
  dueDate: string;
  startDate: string;
  storyPoints: string;
  sprintId: string;
  teamId: string;
  estimatedHours: string;
  actualHours: string;
  remainingHours: string;
  templateId: string;
}

interface SpecialFieldState {
  fixVersion: string;
  release: string;
  environment: string;
  stepsToReproduce: string;
}

const SPECIAL_FIELD_CONFIG = {
  fixVersion: { apiName: "fix_version", label: "Fix version" },
  release: { apiName: "release", label: "Release" },
  environment: { apiName: "environment", label: "Environment" },
  stepsToReproduce: { apiName: "steps_to_reproduce", label: "Steps to Reproduce" },
} as const;

const AUTOSAVE_DEBOUNCE_MS = 800;

const defaultFormState: FormState = {
  title: "",
  description: "",
  taskType: "task",
  priority: "medium",
  status: "todo",
  dueDate: "",
  startDate: "",
  storyPoints: "",
  sprintId: "",
  teamId: "",
  estimatedHours: "",
  actualHours: "",
  remainingHours: "",
  templateId: "",
};

const defaultSpecialFieldState: SpecialFieldState = {
  fixVersion: "",
  release: "",
  environment: "",
  stepsToReproduce: "",
};

const autosaveKey = (projectId: string) => `enhanced-task-creator:${projectId}`;

const isValuePresent = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== null && value !== "";
};

interface ValidationContext {
  form: FormState;
  visibleCustomFields: Array<{ id: string; name: string; isRequired?: boolean }>;
  customFieldValues: CustomFieldValueMap;
  specialFieldValues: SpecialFieldState;
}

const computeValidationIssues = ({ form, visibleCustomFields, customFieldValues, specialFieldValues }: ValidationContext) => {
  const issues: string[] = [];

  if (!form.title.trim()) {
    issues.push("Title is required");
  }

  visibleCustomFields.forEach((definition) => {
    if (!definition.isRequired) {
      return;
    }
    const value = customFieldValues[definition.id];
    if (!isValuePresent(value)) {
      issues.push(`${definition.name} is required`);
    }
  });

  if (form.taskType === "bug" && !specialFieldValues.stepsToReproduce.trim()) {
    issues.push("Steps to Reproduce are required for bugs");
  }

  return issues;
};

const buildDraftPayload = (state: {
  form: FormState;
  assigneeIds: string[];
  watcherIds: string[];
  customFieldValues: CustomFieldValueMap;
  specialFieldValues: SpecialFieldState;
  relationship: any;
  linkedIssues: any[];
}) => ({
  form: state.form,
  assigneeIds: state.assigneeIds,
  watcherIds: state.watcherIds,
  customFieldValues: state.customFieldValues,
  specialFieldValues: state.specialFieldValues,
  relationship: state.relationship,
  linkedIssues: state.linkedIssues,
});

export function EnhancedTaskCreator({ projectId, open, onClose, onCreated, workspaceId }: EnhancedTaskCreatorProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState<FormState>(defaultFormState);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [watcherIds, setWatcherIds] = useState<string[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValueMap>({});
  const [specialFieldValues, setSpecialFieldValues] = useState<SpecialFieldState>(defaultSpecialFieldState);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [relationship, setRelationship] = useState(null);
  const [linkedIssues, setLinkedIssues] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const [autosaveState, setAutosaveState] = useState<{ status: "idle" | "saving" | "saved"; timestamp?: number }>({ status: "idle" });
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [sprints, setSprints] = useState<Array<{ id: string; name: string; status?: string | null }>>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [automationPreviews, setAutomationPreviews] = useState<Array<{ id: string; name: string; trigger: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimer = useRef<number>();

  const {
    definitions: customFieldDefinitions,
    defaults: customFieldDefaults,
    isLoading: loadingCustomFields,
    refetch: refetchCustomFields,
  } = useCustomFieldDefinitions({ projectId, contexts: ["forms", "tasks"], enabled: open });

  const editableCustomFields = useMemo(
    () => customFieldDefinitions.filter((definition) => !isComputedField(definition)),
    [customFieldDefinitions],
  );

  const visibleFieldIds = useVisibleCustomFields(editableCustomFields, customFieldValues);
  const visibleCustomFields = useMemo(
    () => editableCustomFields.filter((definition) => visibleFieldIds.has(definition.id)),
    [editableCustomFields, visibleFieldIds],
  );

  const specialFieldDefinitions = useMemo(() => {
    const mapping = new Map<keyof SpecialFieldState, any>();
    for (const definition of customFieldDefinitions) {
      const entry = Object.entries(SPECIAL_FIELD_CONFIG).find(([, config]) => config.apiName === definition.apiName);
      if (entry) {
        mapping.set(entry[0] as keyof SpecialFieldState, definition);
      }
    }
    return mapping;
  }, [customFieldDefinitions]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const raw = localStorage.getItem(autosaveKey(projectId));
    if (!raw) {
      setForm(defaultFormState);
      setAssigneeIds([]);
      setWatcherIds([]);
      setSpecialFieldValues(defaultSpecialFieldState);
      setCustomFieldValues(customFieldDefaults ?? {});
      setAttachments([]);
      setRelationship(null);
      setLinkedIssues([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setForm({ ...defaultFormState, ...parsed.form });
      setAssigneeIds(parsed.assigneeIds ?? []);
      setWatcherIds(parsed.watcherIds ?? []);
      setSpecialFieldValues({ ...defaultSpecialFieldState, ...parsed.specialFieldValues });
      setCustomFieldValues({ ...customFieldDefaults, ...(parsed.customFieldValues ?? {}) });
      setRelationship(parsed.relationship ?? null);
      setLinkedIssues(parsed.linkedIssues ?? []);
    } catch (error) {
      console.error("Failed to load draft", error);
      setForm(defaultFormState);
      setSpecialFieldValues(defaultSpecialFieldState);
      setCustomFieldValues(customFieldDefaults ?? {});
    }
  }, [open, projectId, customFieldDefaults]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setCustomFieldValues((prev) => ({ ...customFieldDefaults, ...prev }));
  }, [customFieldDefaults, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const fetchTeams = async () => {
      try {
        const { data, error } = await supabase.from("teams").select("id, name").order("name");
        if (error) throw error;
        setTeams(data ?? []);
      } catch (error) {
        console.error("Failed to load teams", error);
        setTeams([]);
      }
    };

    const fetchSprints = async () => {
      try {
        const { data, error } = await supabase
          .from("sprints")
          .select("id, name, status")
          .eq("project_id", projectId)
          .order("start_date", { ascending: false })
          .limit(50);
        if (error) throw error;
        setSprints(data ?? []);
      } catch (error) {
        console.error("Failed to load sprints", error);
        setSprints([]);
      }
    };

    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from("task_templates")
          .select("id, name, description, template_data, project_id, workspace_id")
          .or(`project_id.eq.${projectId},workspace_id.eq.${workspaceId ?? "null"}`)
          .order("name");
        if (error) throw error;
        const records: TemplateSummary[] = (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          template_data: row.template_data as Record<string, unknown> | null,
          scope: row.project_id === projectId ? "project" : "workspace",
        }));
        setTemplates(records);
      } catch (error) {
        console.error("Failed to load templates", error);
        setTemplates([]);
      }
    };

    const fetchAutomationPreview = async () => {
      try {
        const { data, error } = await supabase
          .from("project_automations")
          .select("id, name, trigger")
          .eq("project_id", projectId)
          .limit(20);
        if (error) throw error;
        setAutomationPreviews((data ?? []).map((row) => ({ id: row.id, name: row.name, trigger: row.trigger })));
      } catch (error) {
        console.error("Failed to load automations", error);
        setAutomationPreviews([]);
      }
    };

    fetchTeams();
    fetchSprints();
    fetchTemplates();
    fetchAutomationPreview();
  }, [open, projectId, workspaceId]);

  const persistDraft = useCallback(() => {
    if (!open) {
      return;
    }
    const payload = buildDraftPayload({
      form,
      assigneeIds,
      watcherIds,
      customFieldValues,
      specialFieldValues,
      relationship,
      linkedIssues,
    });
    localStorage.setItem(autosaveKey(projectId), JSON.stringify(payload));
    setAutosaveState({ status: "saved", timestamp: Date.now() });
  }, [open, form, assigneeIds, watcherIds, customFieldValues, specialFieldValues, relationship, linkedIssues, projectId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setAutosaveState((prev) => ({ ...prev, status: "saving" }));
    window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      persistDraft();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(autosaveTimer.current);
    };
  }, [persistDraft]);

  useEffect(() => {
    if (!open) {
      return;
    }
    return () => {
      window.clearTimeout(autosaveTimer.current);
    };
  }, [open]);

  const handleAttachmentSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setAttachments((prev) => [...prev, ...files]);
    event.target.value = "";
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSpecialFieldChange = (key: keyof SpecialFieldState, value: string) => {
    setSpecialFieldValues((prev) => ({ ...prev, [key]: value }));
    const definition = specialFieldDefinitions.get(key);
    if (definition) {
      setCustomFieldValues((prev) => ({ ...prev, [definition.id]: value.trim() ? value : null }));
    }
  };

  const handleTemplateApply = (templateId: string) => {
    setForm((prev) => ({ ...prev, templateId }));
    const selected = templates.find((template) => template.id === templateId);
    if (!selected?.template_data) {
      return;
    }
    const data = selected.template_data;
    setForm((prev) => ({
      ...prev,
      title: typeof data.title === "string" ? data.title : prev.title,
      description: typeof data.description === "string" ? data.description : prev.description,
      priority: data.priority ?? prev.priority,
      taskType: data.taskType ?? prev.taskType,
      status: data.status ?? prev.status,
      sprintId: data.sprintId ?? prev.sprintId,
    }));
    if (Array.isArray(data.assigneeIds)) {
      setAssigneeIds(data.assigneeIds.filter(Boolean));
    }
    if (Array.isArray(data.watcherIds)) {
      setWatcherIds(data.watcherIds.filter(Boolean));
    }
    if (typeof data.storyPoints === "number" || typeof data.storyPoints === "string") {
      setForm((prev) => ({ ...prev, storyPoints: String(data.storyPoints ?? "") }));
    }
    if (typeof data.estimatedHours === "number") {
      setForm((prev) => ({ ...prev, estimatedHours: String(data.estimatedHours) }));
    }
    if (typeof data.specialFieldValues === "object" && data.specialFieldValues) {
      Object.entries(data.specialFieldValues).forEach(([key, value]) => {
        if (key in SPECIAL_FIELD_CONFIG && typeof value === "string") {
          handleSpecialFieldChange(key as keyof SpecialFieldState, value);
        }
      });
    }
    if (typeof data.customFieldValues === "object" && data.customFieldValues) {
      setCustomFieldValues((prev) => ({ ...prev, ...data.customFieldValues }));
    }
  };

  const handleSubmit = async () => {
    const issues = computeValidationIssues({
      form,
      visibleCustomFields,
      customFieldValues,
      specialFieldValues,
    });
    if (issues.length) {
      toast({ title: "Missing information", description: issues.join("\n"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const reporterId = user?.id ?? (await supabase.auth.getUser()).data.user?.id;
      const insertPayload = {
        project_id: projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        task_type: form.taskType,
        priority: form.priority,
        status: form.status,
        assignee_id: assigneeIds[0] ?? null,
        due_date: form.dueDate || null,
        start_date: form.startDate || null,
        sprint_id: form.sprintId || null,
        story_points: form.storyPoints ? Number(form.storyPoints) : null,
        estimated_hours: form.estimatedHours ? Number(form.estimatedHours) : null,
        actual_hours: form.actualHours ? Number(form.actualHours) : null,
        remaining_hours: form.remainingHours ? Number(form.remainingHours) : null,
        reporter_id: reporterId,
      };

      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert(insertPayload)
        .select()
        .single();

      if (taskError) {
        throw taskError;
      }

      const fieldEntries = Object.entries(customFieldValues).filter(([, value]) => isValuePresent(value));
      if (fieldEntries.length) {
        await upsertTaskCustomFieldValues({
          taskId: task.id,
          values: fieldEntries.map(([fieldId, value]) => ({ fieldId, value })),
        });
      }

      if (watcherIds.length) {
        const records = watcherIds.map((id) => ({ task_id: task.id, user_id: id }));
        const { error: watcherError } = await supabase.from("task_watchers").insert(records);
        if (watcherError) {
          console.error("Failed to add watchers", watcherError);
        }
      }

      if (assigneeIds.length > 1) {
        const records = assigneeIds.map((id) => ({ task_id: task.id, user_id: id }));
        await supabase.from("task_assignees").insert(records);
      }

      if (relationship?.target_task_id) {
        await supabase.from("task_relationships").insert({
          source_task_id: task.id,
          relationship_type: relationship.relationship_type,
          target_task_id: relationship.target_task_id,
          notes: relationship.notes ?? null,
        });
      }

      if (attachments.length) {
        for (const file of attachments) {
          try {
            await uploadTaskAttachment(task.id, file);
          } catch (error) {
            console.error("Failed to upload attachment", error);
          }
        }
      }

      toast({ title: "Task created", description: `Task ${task.ticket_number ?? task.id} created successfully.` });
      onCreated?.(task.id);
      localStorage.removeItem(autosaveKey(projectId));
      setForm(defaultFormState);
      setSpecialFieldValues(defaultSpecialFieldState);
      setAssigneeIds([]);
      setWatcherIds([]);
      setCustomFieldValues(customFieldDefaults ?? {});
      setAttachments([]);
      setRelationship(null);
      setLinkedIssues([]);
      setAutosaveState({ status: "idle" });
      refetchCustomFields();
      onClose();
    } catch (error) {
      console.error("Failed to create task", error);
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-x-4 top-4 bottom-4 md:inset-x-auto md:left-1/2 md:w-full md:max-w-4xl md:-translate-x-1/2 bg-background rounded-lg shadow-lg flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Create {form.taskType}</h2>
            <Select value={form.taskType} onValueChange={(value) => setForm((prev) => ({ ...prev, taskType: value }))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="subtask">Subtask</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              {autosaveState.status === "saving" && "Saving draft…"}
              {autosaveState.status === "saved" && autosaveState.timestamp
                ? `Draft saved ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
                    new Date(autosaveState.timestamp),
                  )}`
                : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={form.templateId}
              onValueChange={(value) => {
                handleTemplateApply(value);
              }}
            >
              <SelectTrigger className="w-48 text-left" aria-label="Apply template">
                <SelectValue placeholder="Apply template" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {templates.length === 0 ? <SelectItem value="__none" disabled>No templates</SelectItem> : null}
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                    {template.scope === "workspace" ? " · workspace" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <TabsList className="sticky top-[52px] z-10 grid grid-cols-2 gap-2 border-b border-border bg-background/95 px-4 py-2 text-xs md:grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="relations">Relations</TabsTrigger>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="details" className="px-6 py-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="task-title">Title *</Label>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="What needs to be done?"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Add details, @mention people, attach files…"
                  rows={5}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Todo</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-due">Due date</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-start">Start date</Label>
                  <Input
                    id="task-start"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                  />
                </div>

                {(form.taskType === "story" || form.taskType === "task") && (
                  <div className="space-y-2">
                    <Label htmlFor="task-story-points">Story points</Label>
                    <Input
                      id="task-story-points"
                      type="number"
                      inputMode="numeric"
                      value={form.storyPoints}
                      onChange={(event) => setForm((prev) => ({ ...prev, storyPoints: event.target.value }))}
                      placeholder="0"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="task-sprint">Sprint</Label>
                  <Select
                    value={form.sprintId || "__no_sprint"}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, sprintId: value === "__no_sprint" ? "" : value }))
                    }
                  >
                    <SelectTrigger id="task-sprint">
                      <SelectValue placeholder="Select sprint" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="__no_sprint">No sprint</SelectItem>
                      {sprints.length === 0 ? <SelectItem value="__no_sprints" disabled>No sprints</SelectItem> : null}
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name}
                          {sprint.status ? ` · ${sprint.status}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-team">Team</Label>
                  <Select
                    value={form.teamId || "__no_team"}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, teamId: value === "__no_team" ? "" : value }))
                    }
                  >
                    <SelectTrigger id="task-team">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="__no_team">No team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <AssigneeCompanySelect
                suggestProjectId={projectId}
                value={assigneeIds}
                onChange={setAssigneeIds}
                label="Assign to"
              />

              <AssigneeCompanySelect
                suggestProjectId={projectId}
                value={watcherIds}
                onChange={setWatcherIds}
                label="Watchers"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{SPECIAL_FIELD_CONFIG.fixVersion.label}</Label>
                  <Input
                    value={specialFieldValues.fixVersion}
                    onChange={(event) => handleSpecialFieldChange("fixVersion", event.target.value)}
                    placeholder="2024.3.1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{SPECIAL_FIELD_CONFIG.release.label}</Label>
                  <Input
                    value={specialFieldValues.release}
                    onChange={(event) => handleSpecialFieldChange("release", event.target.value)}
                    placeholder="Q3 Launch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{SPECIAL_FIELD_CONFIG.environment.label}</Label>
                  <Input
                    value={specialFieldValues.environment}
                    onChange={(event) => handleSpecialFieldChange("environment", event.target.value)}
                    placeholder="Production"
                  />
                </div>
                {form.taskType === "bug" ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label>{SPECIAL_FIELD_CONFIG.stepsToReproduce.label} *</Label>
                    <Textarea
                      value={specialFieldValues.stepsToReproduce}
                      onChange={(event) => handleSpecialFieldChange("stepsToReproduce", event.target.value)}
                      placeholder="List each step required to reproduce the issue"
                      rows={4}
                    />
                  </div>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="px-6 py-6 space-y-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Paperclip className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-semibold">Attach files</div>
                <p className="text-xs text-muted-foreground">Upload screenshots, documents, or logs to support this task.</p>
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()}>
                    Upload files
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleAttachmentSelection}
                />
              </div>
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Queued uploads</div>
                  <ul className="space-y-2 text-sm">
                    {attachments.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2"
                      >
                        <span className="truncate pr-2" title={file.name}>
                          {file.name}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAttachment(index)}>
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="relations" className="px-6 py-6 space-y-4">
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <LinkIcon className="h-4 w-4" />
                  Link to other work
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Connect this task to dependencies, duplicates, or related work to keep everyone aligned.
                </p>
                <RelationshipPicker projectId={projectId} value={relationship} onChange={setRelationship} />
              </div>

              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4" />
                  Watchers
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Watchers will receive notifications about updates to this task.
                </p>
                <AssigneeCompanySelect
                  suggestProjectId={projectId}
                  value={watcherIds}
                  onChange={setWatcherIds}
                  label="Add watcher"
                />
              </div>

              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4" />
                  Linked issues
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Track issues connected to this task.</p>
                {linkedIssues.length === 0 ? (
                  <Button variant="outline" type="button" size="sm" onClick={() => setLinkedIssues([{ id: crypto.randomUUID(), name: "Placeholder link" }])}>
                    Add linked issue
                  </Button>
                ) : (
                  <ul className="space-y-2">
                    {linkedIssues.map((issue) => (
                      <li key={issue.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span>{issue.name}</span>
                        <Button variant="ghost" size="sm" onClick={() => setLinkedIssues((prev) => prev.filter((item) => item.id !== issue.id))}>
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent value="time" className="px-6 py-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Estimated hours</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.estimatedHours}
                    onChange={(event) => setForm((prev) => ({ ...prev, estimatedHours: event.target.value }))}
                    placeholder="e.g. 6"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Actual hours</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.actualHours}
                    onChange={(event) => setForm((prev) => ({ ...prev, actualHours: event.target.value }))}
                    placeholder="e.g. 4"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Remaining hours</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={form.remainingHours}
                    onChange={(event) => setForm((prev) => ({ ...prev, remainingHours: event.target.value }))}
                    placeholder="e.g. 2"
                  />
                </div>
              </div>
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4" />
                  Time tracking guidance
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Capture actual effort for accurate reporting and forecasting. Estimates help backlog prioritization and sprint planning.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="px-6 py-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Custom fields</div>
                  <p className="text-xs text-muted-foreground">Extend the task with project-specific metadata.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsWizardOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add field
                </Button>
              </div>

              {loadingCustomFields ? (
                <div className="space-y-3" aria-live="polite">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-10 w-full animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              ) : null}

              {visibleCustomFields.length > 0 ? (
                <div className="space-y-4 rounded-lg border p-4">
                  {visibleCustomFields.map((definition) => (
                    <div key={definition.id} className="space-y-2">
                      <Label>
                        {definition.name}
                        {definition.isRequired ? <span className="ml-1 text-destructive">*</span> : null}
                      </Label>
                      {renderCustomFieldInput(definition, customFieldValues, (value) =>
                        setCustomFieldValues((prev) => ({ ...prev, [definition.id]: value })),
                      )}
                      {definition.description ? (
                        <p className="text-xs text-muted-foreground">{definition.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                !loadingCustomFields && (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No custom fields configured for tasks yet.
                  </div>
                )
              )}

              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4" />
                  Automation preview
                </div>
                {automationPreviews.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No automations will trigger for this task. Configure project automations to automate updates and notifications.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {automationPreviews.map((automation) => (
                      <li key={automation.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div>
                          <div className="font-medium">{automation.name}</div>
                          <div className="text-xs text-muted-foreground">Trigger: {automation.trigger}</div>
                        </div>
                        <Badge variant="outline">Will run</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-background/90 px-4 py-3 backdrop-blur">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => persistDraft()}>
              Save draft
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
              {saving ? "Creating…" : "Create task"}
            </Button>
          </div>
        </div>
      </div>

      <InlineCustomFieldWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        projectId={projectId}
        workspaceId={workspaceId}
        onCreated={() => {
          refetchCustomFields();
        }}
      />
    </div>
  );
}

const renderCustomFieldInput = (definition, values, onChange) => {
  const value = values?.[definition.id];
  switch (definition.fieldType) {
    case "text":
    case "url":
      return (
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Enter ${definition.name.toLowerCase()}`}
        />
      );
    case "number":
    case "story_points":
    case "time_estimate":
    case "effort":
    case "risk":
      return (
        <Input
          type="number"
          inputMode="decimal"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        />
      );
    case "single_select":
      return (
        <Select value={value ?? ""} onValueChange={(selected) => onChange(selected)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {definition.optionSet?.options?.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multi_select":
      return (
        <div className="flex flex-wrap gap-2">
          {definition.optionSet?.options?.map((option) => {
            const selected = Array.isArray(value) && value.includes(option.id);
            return (
              <Button
                key={option.id}
                type="button"
                variant={selected ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  const next = selected
                    ? current.filter((entry) => entry !== option.id)
                    : [...current, option.id];
                  onChange(next);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      );
    case "date":
      return (
        <Input
          type="date"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
        />
      );
    case "date_range":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={value?.[0] ?? ""}
            onChange={(event) => {
              const [, end] = Array.isArray(value) ? value : ["", ""];
              onChange([event.target.value, end]);
            }}
          />
          <Input
            type="date"
            value={value?.[1] ?? ""}
            onChange={(event) => {
              const [start] = Array.isArray(value) ? value : ["", ""];
              onChange([start, event.target.value]);
            }}
          />
        </div>
      );
    default:
      return (
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
};

export const __testing__ = {
  autosaveKey,
  isValuePresent,
  computeValidationIssues,
  buildDraftPayload,
};

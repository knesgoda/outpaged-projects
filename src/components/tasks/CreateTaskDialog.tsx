import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartTaskTypeSelector, SMART_TASK_TYPE_OPTIONS } from "./SmartTaskTypeSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AssigneeCompanySelect from "./AssigneeCompanySelect";
import RelationshipPicker from "./RelationshipPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomFieldDefinitions, useVisibleCustomFields } from "@/hooks/useCustomFields";
import { isComputedField } from "@/domain/customFields";
import { upsertTaskCustomFieldValues, type TaskCustomFieldValueInput } from "@/services/customFields";
import { uploadTaskAttachment } from "@/services/storage";
import { domainEventBus } from "@/domain/events/domainEventBus";

const SPECIAL_FIELD_CONFIG = {
  fixVersion: { apiName: "fix_version", label: "Fix Version" },
  release: { apiName: "release", label: "Release" },
  environment: { apiName: "environment", label: "Environment" },
  customer: { apiName: "customer", label: "Customer" },
  stepsToReproduce: { apiName: "steps_to_reproduce", label: "Steps to Reproduce" },
} as const;

type SpecialFieldKey = keyof typeof SPECIAL_FIELD_CONFIG;
const SPECIAL_FIELD_ENTRIES = Object.entries(SPECIAL_FIELD_CONFIG) as Array<
  [SpecialFieldKey, { apiName: string; label: string }]
>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTaskCreated: () => void;
}

export function CreateTaskDialog({ open, onOpenChange, projectId, onTaskCreated }: CreateTaskDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    smartTaskType: "task"
  });
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [relationship, setRelationship] = useState<{
    relationship_type: "blocks" | "depends_on" | "duplicates" | "relates_to";
    target_task_id: string;
    notes?: string;
  } | null>(null);
  const [watcherIds, setWatcherIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>("");
  const [availableSprints, setAvailableSprints] = useState<Array<{ id: string; name: string; status?: string | null }>>([]);
  const [specialFieldValues, setSpecialFieldValues] = useState<Record<SpecialFieldKey, string>>({
    fixVersion: "",
    release: "",
    environment: "",
    customer: "",
    stepsToReproduce: "",
  });

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    definitions: customFieldDefinitions,
    defaults: customFieldDefaults,
    isLoading: customFieldsLoading,
  } = useCustomFieldDefinitions({ projectId, contexts: ["forms", "tasks"] });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const specialFieldDefinitions = useMemo(() => {
    const mapping = new Map<SpecialFieldKey, (typeof customFieldDefinitions)[number]>();
    for (const definition of customFieldDefinitions) {
      const entry = SPECIAL_FIELD_ENTRIES.find(([, config]) => config.apiName === definition.apiName);
      if (entry) {
        mapping.set(entry[0], definition);
      }
    }
    return mapping;
  }, [customFieldDefinitions]);
  const specialFieldIds = useMemo(() => {
    return new Set(Array.from(specialFieldDefinitions.values()).map((definition) => definition.id));
  }, [specialFieldDefinitions]);
  const specialFieldDefaultValues = useMemo(() => {
    const base: Record<SpecialFieldKey, string> = {
      fixVersion: "",
      release: "",
      environment: "",
      customer: "",
      stepsToReproduce: "",
    };
    for (const [key, definition] of specialFieldDefinitions) {
      const defaultValue = customFieldDefaults?.[definition.id];
      if (typeof defaultValue === "string") {
        base[key] = defaultValue;
      } else if (defaultValue != null) {
        base[key] = String(defaultValue);
      }
    }
    return base;
  }, [customFieldDefaults, specialFieldDefinitions]);

  useEffect(() => {
    if (!customFieldDefinitions.length) {
      setCustomFieldValues({});
      return;
    }
    setCustomFieldValues(prev => {
      const next = { ...customFieldDefaults };
      for (const key of Object.keys(prev)) {
        next[key] = prev[key];
      }
      return next;
    });
  }, [customFieldDefaults, customFieldDefinitions]);
  useEffect(() => {
    if (!open) {
      return;
    }
    setSpecialFieldValues(specialFieldDefaultValues);
  }, [open, specialFieldDefaultValues]);

  useEffect(() => {
    if (!open || !projectId) {
      return;
    }
    let isMounted = true;
    const fetchSprints = async () => {
      try {
        const { data, error } = await supabase
          .from("sprints")
          .select("id, name, status")
          .eq("project_id", projectId)
          .order("start_date", { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        if (isMounted) {
          setAvailableSprints(data ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch sprints", error);
        if (isMounted) {
          setAvailableSprints([]);
        }
      }
    };

    fetchSprints();

    return () => {
      isMounted = false;
    };
  }, [open, projectId]);

  const editableCustomFields = useMemo(
    () => customFieldDefinitions.filter(definition => !isComputedField(definition) && !specialFieldIds.has(definition.id)),
    [customFieldDefinitions, specialFieldIds],
  );

  const orderedCustomFields = useMemo(
    () =>
      [...editableCustomFields].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name)),
    [editableCustomFields],
  );

  const visibleCustomFieldIds = useVisibleCustomFields(orderedCustomFields, customFieldValues);
  const visibleCustomFields = useMemo(
    () => orderedCustomFields.filter(definition => visibleCustomFieldIds.has(definition.id)),
    [orderedCustomFields, visibleCustomFieldIds],
  );

  const handleCustomFieldChange = (fieldId: string, value: unknown) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSpecialFieldChange = (key: SpecialFieldKey, value: string) => {
    setSpecialFieldValues(prev => ({ ...prev, [key]: value }));
    const definition = specialFieldDefinitions.get(key);
    if (definition) {
      const sanitized = value.trim().length === 0 ? null : value;
      handleCustomFieldChange(definition.id, sanitized);
    }
  };

  const handleAttachmentSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    setAttachments(prev => {
      const existing = new Set(prev.map(file => `${file.name}:${file.size}:${file.lastModified}`));
      const deduped = files.filter(file => !existing.has(`${file.name}:${file.size}:${file.lastModified}`));
      return deduped.length > 0 ? [...prev, ...deduped] : prev;
    });
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== index));
  };

  const buildCustomFieldPayload = (): TaskCustomFieldValueInput[] => {
    return visibleCustomFields
      .filter(definition => !definition.isPrivate)
      .map(definition => ({
        customFieldId: definition.id,
        value: (
          customFieldValues[definition.id] === "" || customFieldValues[definition.id] === undefined
            ? null
            : customFieldValues[definition.id]
        ) as any,
      }))
      .filter(
        entry =>
          entry.value !== undefined &&
          entry.value !== null &&
          (!(Array.isArray(entry.value)) || entry.value.length > 0),
      );
  };

  const renderCustomFieldInput = (definition: (typeof visibleCustomFields)[number]) => {
    const value = customFieldValues[definition.id];
    switch (definition.fieldType) {
      case "text":
      case "url": {
        return (
          <Input
            value={typeof value === "string" ? value : ""}
            onChange={(event) => handleCustomFieldChange(definition.id, event.target.value)}
            placeholder={definition.description ?? "Enter a value"}
          />
        );
      }
      case "number":
      case "story_points":
      case "time_estimate":
      case "effort":
      case "risk": {
        const numeric = typeof value === "number" ? value : value == null ? "" : Number(value) || "";
        return (
          <Input
            type="number"
            value={numeric}
            onChange={(event) => {
              const next = event.target.value;
              handleCustomFieldChange(definition.id, next === "" ? null : Number(next));
            }}
            placeholder={definition.description ?? "0"}
          />
        );
      }
      case "single_select": {
        if (definition.optionSet?.options?.length) {
          const stringValue = typeof value === "string" ? value : value == null ? "" : String(value);
          return (
            <Select
              value={stringValue}
              onValueChange={(next) => handleCustomFieldChange(definition.id, next)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {definition.optionSet.options.map(option => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return (
          <Input
            value={typeof value === "string" ? value : ""}
            onChange={(event) => handleCustomFieldChange(definition.id, event.target.value)}
            placeholder="Enter a value"
          />
        );
      }
      case "multi_select": {
        const options = Array.isArray(value) ? (value as unknown[]).map(item => String(item)) : [];
        return (
          <Input
            value={options.join(", ")}
            onChange={(event) => {
              const next = event.target.value
                .split(",")
                .map(item => item.trim())
                .filter(item => item.length > 0);
              handleCustomFieldChange(definition.id, next);
            }}
            placeholder={definition.optionSet?.options?.length ? "Select or enter options" : "Enter comma separated values"}
          />
        );
      }
      case "date": {
        const dateValue = typeof value === "string" ? value : value instanceof Date ? value.toISOString().slice(0, 10) : "";
        return (
          <Input
            type="date"
            value={dateValue}
            onChange={(event) => handleCustomFieldChange(definition.id, event.target.value || null)}
          />
        );
      }
      case "date_range": {
        const rangeValue =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as { start?: string; end?: string })
            : { start: "", end: "" };
        return (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              type="date"
              value={rangeValue.start ?? ""}
              onChange={(event) =>
                handleCustomFieldChange(definition.id, { ...rangeValue, start: event.target.value || null })
              }
            />
            <Input
              type="date"
              value={rangeValue.end ?? ""}
              onChange={(event) =>
                handleCustomFieldChange(definition.id, { ...rangeValue, end: event.target.value || null })
              }
            />
          </div>
        );
      }
      default: {
        return (
          <Input
            value={typeof value === "string" ? value : value == null ? "" : String(value)}
            onChange={(event) => handleCustomFieldChange(definition.id, event.target.value)}
            placeholder="Enter a value"
          />
        );
      }
    }
  };

  // Don't render dialog if user is not authenticated
  if (!user) {
    return null;
  }

  // Insert task and let the DB trigger assign ticket_number atomically
  const insertTask = async () => {
    const selectedOption = SMART_TASK_TYPE_OPTIONS.find(option => option.id === formData.smartTaskType);
    if (!selectedOption) {
      throw new Error("Invalid task type selected");
    }

    console.log("Inserting task (DB will assign ticket_number):", {
      title: formData.title,
      projectId,
      status: formData.status,
      priority: formData.priority,
      story_points: storyPoints ? Number(storyPoints) : undefined,
      start_date: startDate || undefined,
      due_date: dueDate || undefined,
      sprint_id: sprintId || undefined,
    });

    return await supabase
      .from('tasks')
      .insert({
        title: formData.title,
        description: formData.description,
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        status: formData.status as 'todo' | 'in_progress' | 'in_review' | 'done',
        hierarchy_level: selectedOption.hierarchy_level,
        task_type: selectedOption.task_type,
        project_id: projectId,
        reporter_id: user!.id,
        story_points: storyPoints ? Number(storyPoints) : null,
        start_date: startDate ? startDate : null,
        due_date: dueDate ? dueDate : null,
        sprint_id: sprintId ? sprintId : null,
      })
      .select()
      .single();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create tasks",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a task title.",
        variant: "destructive",
      });
      return;
    }

    console.log('Creating task with:', {
      user: user.id,
      projectId,
      formData,
      storyPoints,
      assigneeIds,
      watcherIds,
      relationship,
      startDate,
      dueDate,
      sprintId,
      attachmentCount: attachments.length,
      specialFieldValues,
    });

    if (formData.smartTaskType === "bug") {
      const stepsValue = specialFieldValues.stepsToReproduce.trim();
      if (!stepsValue) {
        toast({
          title: "Missing required field",
          description: "Steps to Reproduce are required for bug reports.",
          variant: "destructive",
        });
        return;
      }
    }

    const missingRequiredField = visibleCustomFields.find((definition) => {
      if (!definition.isRequired) {
        return false;
      }
      const value = customFieldValues[definition.id];
      if (value === undefined || value === null || value === "") {
        return true;
      }
      if (Array.isArray(value) && value.length === 0) {
        return true;
      }
      if (
        definition.fieldType === "date_range" &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        const rangeValue = value as { start?: string | null; end?: string | null };
        return !rangeValue.start && !rangeValue.end;
      }
      return false;
    });

    if (missingRequiredField) {
      toast({
        title: "Missing required field",
        description: `${missingRequiredField.name} is required.`,
        variant: "destructive",
      });
      return;
    }

    const customFieldPayload = buildCustomFieldPayload();

    setLoading(true);
    let createdTaskId: string | undefined;
    try {
      // Single attempt: rely entirely on DB trigger for ticket_number
      const { data: newTask, error } = await insertTask();

      // In rare cases of a conflict, retry once
      if (error && (error as any).code === '23505') {
        console.warn("Conflict detected (23505). Retrying insert to let trigger assign a fresh number...");
        const retry = await insertTask();
        if (retry.error) throw retry.error;
        // Use the retried data
        const created = retry.data;
        createdTaskId = created?.id;
        // Post-create operations (assignees & relationship)
        await postCreateOperations(created?.id, customFieldPayload);
      } else if (error) {
        throw error;
      } else {
        createdTaskId = newTask?.id;
        await postCreateOperations(newTask?.id, customFieldPayload);
      }

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      if (createdTaskId) {
        domainEventBus.publish({
          type: "item.created",
          payload: {
            id: createdTaskId,
            projectId,
            status: formData.status,
            priority: formData.priority,
            smartTaskType: formData.smartTaskType,
          },
        });
      }

      // Reset state
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        smartTaskType: "task"
      });
      setAssigneeIds([]);
      setStoryPoints("");
      setRelationship(null);
      setWatcherIds([]);
      setAttachments([]);
      fileInputRef.current && (fileInputRef.current.value = "");
      setStartDate("");
      setDueDate("");
      setSprintId("");
      setCustomFieldValues({ ...customFieldDefaults });
      setSpecialFieldValues(specialFieldDefaultValues);

      onTaskCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating task:', error);
      console.error('Error details:', {
        error,
        user: user?.id,
        projectId,
        formData
      });
      const message =
        error?.message ||
        (typeof error === 'string' ? error : 'Unknown error');
      toast({
        title: "Error",
        description: `Failed to create task: ${message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const postCreateOperations = async (
    taskId: string | undefined,
    customFieldEntries: TaskCustomFieldValueInput[] = [],
  ) => {
    if (!taskId) return;

    // 1) Assign selected users
    if (assigneeIds.length > 0) {
      const assigneeInserts = assigneeIds.map((id) => ({
        task_id: taskId,
        user_id: id,
        assigned_by: user!.id
      }));
      const { error: assigneeError } = await supabase.from("task_assignees").insert(assigneeInserts);
      if (assigneeError) {
        console.error("Failed to add assignees:", assigneeError);
        toast({
          title: "Warning",
          description: "Task created but failed to add assignees.",
          variant: "destructive",
        });
      }
    }

    if (watcherIds.length > 0) {
      const watcherInserts = watcherIds.map((id) => ({
        task_id: taskId,
        user_id: id,
        added_by: user!.id,
      }));
      const { error: watcherError } = await supabase.from("task_watchers").insert(watcherInserts);
      if (watcherError) {
        console.error("Failed to add watchers:", watcherError);
        toast({
          title: "Warning",
          description: "Task created but failed to add watchers.",
          variant: "destructive",
        });
      }
    }

    if (attachments.length > 0) {
      try {
        await Promise.all(
          attachments.map(async (file) => {
            const { publicUrl } = await uploadTaskAttachment(file, taskId, user!.id);
            const { error: fileError } = await supabase.from("task_files").insert({
              task_id: taskId,
              file_url: publicUrl,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type || null,
              uploaded_by: user!.id,
            });
            if (fileError) {
              throw fileError;
            }
          }),
        );
      } catch (error) {
        console.error("Failed to upload attachments", error);
        toast({
          title: "Warning",
          description: "Task saved but attachments could not be uploaded.",
          variant: "destructive",
        });
      }
    }

    // 2) Optional relationship
    if (relationship?.target_task_id && relationship.relationship_type) {
      const { error: relError } = await supabase
        .from("task_relationships")
        .insert({
          source_task_id: taskId,
          target_task_id: relationship.target_task_id,
          relationship_type: relationship.relationship_type,
          notes: relationship.notes || null,
          created_by: user!.id,
        });
      if (relError) {
        console.error("Failed to create relationship:", relError);
        toast({
          title: "Warning",
          description: "Task created but failed to create the relationship.",
          variant: "destructive",
        });
      }
    }

    if (customFieldEntries.length) {
      try {
        await upsertTaskCustomFieldValues(taskId, customFieldEntries);
      } catch (error: unknown) {
        console.error("Failed to persist custom fields", error);
        toast({
          title: "Warning",
          description: "Task saved but custom fields could not be stored.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col z-[50]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription id="create-task-description">
            Fill in the details, assign teammates, add story points, and optionally link to another ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          <SmartTaskTypeSelector
            value={formData.smartTaskType}
            onChange={(value) => setFormData(prev => ({ ...prev, smartTaskType: value }))}
            label="What type of work is this?"
            placeholder="Choose the type of work..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                 <SelectContent className="z-[60]">
                   <SelectItem value="low">Low</SelectItem>
                   <SelectItem value="medium">Medium</SelectItem>
                   <SelectItem value="high">High</SelectItem>
                   <SelectItem value="urgent">Urgent</SelectItem>
                 </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                 <SelectContent className="z-[60]">
                   <SelectItem value="todo">Todo</SelectItem>
                   <SelectItem value="in_progress">In Progress</SelectItem>
                   <SelectItem value="in_review">Review</SelectItem>
                   <SelectItem value="done">Done</SelectItem>
                 </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AssigneeCompanySelect
              suggestProjectId={projectId}
              value={assigneeIds}
              onChange={setAssigneeIds}
              label="Assign to"
            />


            <div className="space-y-2">
              <Label htmlFor="story_points">Story points</Label>
              <Input
                id="story_points"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 3"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
              />
            </div>
          </div>

          <AssigneeCompanySelect
            suggestProjectId={projectId}
            value={watcherIds}
            onChange={setWatcherIds}
            label="Watchers"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due date</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sprint">Sprint</Label>
            <Select value={sprintId} onValueChange={setSprintId}>
              <SelectTrigger id="sprint">
                <SelectValue placeholder="Select sprint" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="">No sprint</SelectItem>
                {availableSprints.length === 0 ? (
                  <SelectItem value="__no_sprints" disabled>
                    No sprints available
                  </SelectItem>
                ) : (
                  availableSprints.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                      {sprint.status ? ` · ${sprint.status}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fix_version">{SPECIAL_FIELD_CONFIG.fixVersion.label}</Label>
              <Input
                id="fix_version"
                value={specialFieldValues.fixVersion}
                onChange={(e) => handleSpecialFieldChange("fixVersion", e.target.value)}
                placeholder="e.g. 2024.3.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="release">{SPECIAL_FIELD_CONFIG.release.label}</Label>
              <Input
                id="release"
                value={specialFieldValues.release}
                onChange={(e) => handleSpecialFieldChange("release", e.target.value)}
                placeholder="e.g. Q3 Launch"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="environment">{SPECIAL_FIELD_CONFIG.environment.label}</Label>
              <Input
                id="environment"
                value={specialFieldValues.environment}
                onChange={(e) => handleSpecialFieldChange("environment", e.target.value)}
                placeholder="e.g. Production"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer">{SPECIAL_FIELD_CONFIG.customer.label}</Label>
              <Input
                id="customer"
                value={specialFieldValues.customer}
                onChange={(e) => handleSpecialFieldChange("customer", e.target.value)}
                placeholder="Customer or account"
              />
            </div>
          </div>

          {formData.smartTaskType === "bug" ? (
            <div className="space-y-2">
              <Label htmlFor="steps_to_reproduce">{SPECIAL_FIELD_CONFIG.stepsToReproduce.label} *</Label>
              <Textarea
                id="steps_to_reproduce"
                value={specialFieldValues.stepsToReproduce}
                onChange={(e) => handleSpecialFieldChange("stepsToReproduce", e.target.value)}
                placeholder="List each step required to reproduce the issue"
                rows={4}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="task_attachments">Attachments</Label>
            <Input
              id="task_attachments"
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleAttachmentSelection}
            />
            {attachments.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {attachments.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2"
                  >
                    <span className="truncate pr-2" title={file.name}>
                      {file.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {customFieldsLoading ? (
            <div className="space-y-3" aria-live="polite">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : visibleCustomFields.length > 0 ? (
            <div className="space-y-4 rounded-md border p-4">
              <div>
                <h3 className="text-sm font-semibold">Custom fields</h3>
                <p className="text-xs text-muted-foreground">
                  Additional metadata captured for automation, boards, and reporting.
                </p>
              </div>
              {visibleCustomFields.map((definition) => (
                <div key={definition.id} className="space-y-2">
                  <Label>
                    {definition.name}
                    {definition.isRequired ? <span className="ml-1 text-destructive">*</span> : null}
                  </Label>
                  {renderCustomFieldInput(definition)}
                  {definition.description ? (
                    <p className="text-xs text-muted-foreground">{definition.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-3 border rounded-md p-3">
            <div className="text-sm font-medium">Link to another ticket (optional)</div>
            <RelationshipPicker
              projectId={projectId}
              value={relationship}
              onChange={setRelationship}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

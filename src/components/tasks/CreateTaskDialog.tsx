import { useEffect, useMemo, useState } from "react";
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

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    definitions: customFieldDefinitions,
    defaults: customFieldDefaults,
    isLoading: customFieldsLoading,
  } = useCustomFieldDefinitions({ projectId, contexts: ["forms", "tasks"] });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

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

  const editableCustomFields = useMemo(
    () => customFieldDefinitions.filter(definition => !isComputedField(definition)),
    [customFieldDefinitions],
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
      story_points: storyPoints ? Number(storyPoints) : undefined
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
      relationship
    });

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
        // Post-create operations (assignees & relationship)
        await postCreateOperations(created?.id, customFieldPayload);
      } else if (error) {
        throw error;
      } else {
        await postCreateOperations(newTask?.id, customFieldPayload);
      }

      toast({
        title: "Success",
        description: "Task created successfully",
      });

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
      setCustomFieldValues({ ...customFieldDefaults });
      
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

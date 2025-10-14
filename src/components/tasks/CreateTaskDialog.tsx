// @ts-nocheck
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useRichTextChips } from "@/hooks/useRichTextChips";
import type { MentionSuggestionItem } from "@/components/rich-text/extensions/mention";
import type { CrossReferenceSuggestion } from "@/components/rich-text/extensions/xref";
import { SlashCommandExtension } from "@/components/rich-text/extensions/slash-command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartTaskTypeSelector, SMART_TASK_TYPE_OPTIONS } from "./SmartTaskTypeSelector";
import AssigneeCompanySelect from "./AssigneeCompanySelect";
import RelationshipPicker from "./RelationshipPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCustomFieldDefinitions, useVisibleCustomFields } from "@/hooks/useCustomFields";
import { isComputedField } from "@/domain/customFields";
import {
  upsertTaskCustomFieldValues,
  type TaskCustomFieldValueInput,
} from "@/services/customFields";
import { InlineCustomFieldWizard } from "@/components/projects/InlineCustomFieldWizard";
import { domainEventBus } from "@/domain/events/domainEventBus";
import { addTaskWatchers } from "@/services/tasks/taskWatchers";
import { persistTaskFiles } from "@/services/tasks/taskFiles";
import { enqueueItemMutation } from "@/services/offline";
import { useWorkspaceContext } from "@/state/workspace";
import { AlertTriangle, Loader2, Paperclip, Plus, Upload, X } from "lucide-react";
import { searchCrossReferences } from "@/services/search";
import { searchTeammates } from "@/services/people";

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

const DEFAULT_FORM = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  smartTaskType: "task",
};

const PRIORITY_BY_TYPE: Record<string, string> = {
  bug: "urgent",
  incident: "urgent",
  change: "high",
  risk: "high",
  idea: "low",
  request: "medium",
};

const DUPLICATE_LOOKBACK_DAYS = 30;

interface DuplicateCandidate {
  id: string;
  title: string;
  ticket_number?: number | null;
  status?: string | null;
  created_at?: string | null;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTaskCreated?: (taskId: string, meta?: { pending?: boolean }) => void;
  defaults?: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    smartTaskType?: string;
    assigneeIds?: string[];
    watcherIds?: string[];
    storyPoints?: string;
    startDate?: string;
    dueDate?: string;
    sprintId?: string;
    customFieldValues?: Record<string, unknown>;
  };
  source?: string;
}

interface SprintOption {
  id: string;
  name: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  onTaskCreated,
  defaults,
  source,
}: CreateTaskDialogProps) {
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [watcherIds, setWatcherIds] = useState<string[]>([]);
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [relationship, setRelationship] = useState<{
    relationship_type: "blocks" | "depends_on" | "duplicates" | "relates_to";
    target_task_id: string;
    notes?: string;
  } | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [sprintId, setSprintId] = useState<string>("");
  const [availableSprints, setAvailableSprints] = useState<SprintOption[]>([]);
  const [specialFieldValues, setSpecialFieldValues] = useState<Record<SpecialFieldKey, string>>({
    fixVersion: "",
    release: "",
    environment: "",
    customer: "",
    stepsToReproduce: "",
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateCandidate[]>([]);
  const [priorityTouched, setPriorityTouched] = useState(false);
  const [startDateTouched, setStartDateTouched] = useState(false);
  const [dueDateTouched, setDueDateTouched] = useState(false);
  const [showCustomFieldWizard, setShowCustomFieldWizard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const descriptionChips = useRichTextChips(
    useMemo(
      () => ({
        mentions: {
          fetchSuggestions: async (query: string) => {
            if (!query.trim()) return [];
            const result = await searchTeammates({ q: query, projectId });
            return result.slice(0, 20).map((profile) => ({
              id: profile.user_id,
              label: profile.full_name ?? profile.email ?? "Unknown user",
              description: profile.email ?? undefined,
              avatarUrl: profile.avatar_url ?? null,
            } satisfies MentionSuggestionItem));
          },
        },
        crossReferences: {
          fetchSuggestions: async (query: string) => {
            return searchCrossReferences({ query, projectId });
          },
        },
      }),
      [projectId]
    )
  );

  const {
    definitions: customFieldDefinitions,
    defaults: customFieldDefaults,
    isLoading: customFieldsLoading,
    refetch: refetchCustomFields,
  } = useCustomFieldDefinitions({ projectId, contexts: ["forms", "tasks"], enabled: open });

  const specialFieldDefinitions = useMemo(() => {
    const mapping = new Map<SpecialFieldKey, (typeof customFieldDefinitions)[number]>();
    for (const definition of customFieldDefinitions) {
      const match = SPECIAL_FIELD_ENTRIES.find(([, config]) => config.apiName === definition.apiName);
      if (match) {
        mapping.set(match[0], definition);
      }
    }
    return mapping;
  }, [customFieldDefinitions]);

  const specialFieldIds = useMemo(() => new Set(Array.from(specialFieldDefinitions.values()).map((definition) => definition.id)), [specialFieldDefinitions]);

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

  const editableCustomFields = useMemo(
    () => customFieldDefinitions.filter((definition) => !isComputedField(definition) && !specialFieldIds.has(definition.id)),
    [customFieldDefinitions, specialFieldIds],
  );

  const orderedCustomFields = useMemo(
    () =>
      [...editableCustomFields].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name),
      ),
    [editableCustomFields],
  );

  const visibleCustomFieldIds = useVisibleCustomFields(orderedCustomFields, customFieldValues);
  const visibleCustomFields = useMemo(
    () => orderedCustomFields.filter((definition) => visibleCustomFieldIds.has(definition.id)),
    [orderedCustomFields, visibleCustomFieldIds],
  );

  const resetFormState = () => {
    const priority = defaults?.priority ?? PRIORITY_BY_TYPE[defaults?.smartTaskType ?? ""] ?? "medium";
    const status = defaults?.status ?? "todo";
    const smartTaskType = defaults?.smartTaskType ?? "task";
    setFormData({
      title: defaults?.title ?? "",
      description: defaults?.description ?? "",
      priority,
      status,
      smartTaskType,
    });
    setPriorityTouched(Boolean(defaults?.priority));
    setAssigneeIds(defaults?.assigneeIds?.length ? defaults!.assigneeIds! : user ? [user.id] : []);
    setWatcherIds(defaults?.watcherIds ?? []);
    setStoryPoints(defaults?.storyPoints ?? "");
    setStartDate(defaults?.startDate ?? "");
    setDueDate(defaults?.dueDate ?? "");
    setSprintId(defaults?.sprintId ?? "");
    setStartDateTouched(Boolean(defaults?.startDate));
    setDueDateTouched(Boolean(defaults?.dueDate));
    setAttachments([]);
    setRelationship(null);
    setDuplicateMatches([]);
    setSpecialFieldValues((prev) => {
      const base = { ...specialFieldDefaultValues };
      if (defaults?.customFieldValues) {
        for (const [fieldId, value] of Object.entries(defaults.customFieldValues)) {
          const entry = Array.from(specialFieldDefinitions.entries()).find(([, definition]) => definition.id === fieldId);
          if (entry) {
            base[entry[0]] = value == null ? "" : String(value);
          }
        }
      }
      return base;
    });
    setCustomFieldValues(() => {
      const base = { ...(customFieldDefaults ?? {}) };
      if (defaults?.customFieldValues) {
        for (const [fieldId, value] of Object.entries(defaults.customFieldValues)) {
          base[fieldId] = value;
        }
      }
      return base;
    });
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    resetFormState();
  }, [open, projectId, customFieldDefaults, specialFieldDefaultValues, user?.id]);

  useEffect(() => {
    if (!open || !projectId) {
      return;
    }
    let isMounted = true;
    const fetchSprints = async () => {
      try {
        const { data, error } = await supabase
          .from("sprints")
          .select("id, name, status, start_date, end_date")
          .eq("project_id", projectId)
          .order("start_date", { ascending: false })
          .limit(100);
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

  useEffect(() => {
    if (!open) return;
    if (!sprintId || dueDateTouched) return;
    const sprint = availableSprints.find((item) => item.id === sprintId);
    if (sprint?.end_date) {
      setDueDate(sprint.end_date.slice(0, 10));
    }
    if (sprint?.start_date && !startDateTouched) {
      setStartDate(sprint.start_date.slice(0, 10));
    }
  }, [open, sprintId, availableSprints, dueDateTouched, startDateTouched]);

  const handleCustomFieldChange = (fieldId: string, value: unknown) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSpecialFieldChange = (key: SpecialFieldKey, value: string) => {
    setSpecialFieldValues((prev) => ({ ...prev, [key]: value }));
    const definition = specialFieldDefinitions.get(key);
    if (definition) {
      const sanitized = value.trim().length === 0 ? null : value;
      handleCustomFieldChange(definition.id, sanitized);
    }
  };

  const handleAttachmentSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setAttachments((prev) => {
      const dedupe = new Set(prev.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const next = files.filter((file) => !dedupe.has(`${file.name}:${file.size}:${file.lastModified}`));
      return next.length ? [...prev, ...next] : prev;
    });
    event.target.value = "";
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const buildCustomFieldPayload = (): TaskCustomFieldValueInput[] => {
    return visibleCustomFields
      .filter((definition) => !definition.isPrivate)
      .map((definition) => ({
        customFieldId: definition.id,
        value:
          customFieldValues[definition.id] === "" || customFieldValues[definition.id] === undefined
            ? null
            : customFieldValues[definition.id],
      }))
      .filter((entry) => {
        if (entry.value === undefined || entry.value === null) return false;
        if (Array.isArray(entry.value)) return entry.value.length > 0;
        return true;
      });
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
            <Select value={stringValue} onValueChange={(next) => handleCustomFieldChange(definition.id, next)}>
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                {definition.optionSet.options.map((option) => (
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
        const options = Array.isArray(value) ? (value as unknown[]).map((item) => String(item)) : [];
        return (
          <Input
            value={options.join(", ")}
            onChange={(event) => {
              const next = event.target.value
                .split(",")
                .map((item) => item.trim())
                .filter((item) => item.length > 0);
              handleCustomFieldChange(definition.id, next);
            }}
            placeholder={
              definition.optionSet?.options?.length
                ? "Select or enter options"
                : "Enter comma separated values"
            }
          />
        );
      }
      case "date": {
        const dateValue =
          typeof value === "string"
            ? value
            : value instanceof Date
            ? value.toISOString().slice(0, 10)
            : "";
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

  const validateBeforeSubmit = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You need to sign in before creating tasks.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a task title.",
        variant: "destructive",
      });
      return false;
    }

    if (formData.smartTaskType === "bug") {
      const stepsValue = specialFieldValues.stepsToReproduce.trim();
      if (!stepsValue) {
        toast({
          title: "Missing required field",
          description: "Steps to Reproduce are required for bug reports.",
          variant: "destructive",
        });
        return false;
      }
    }

    const missingCustom = visibleCustomFields.find((definition) => {
      if (!definition.isRequired) return false;
      const value = customFieldValues[definition.id];
      if (value === undefined || value === null || value === "") return true;
      if (Array.isArray(value) && value.length === 0) return true;
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

    if (missingCustom) {
      toast({
        title: "Missing required field",
        description: `${missingCustom.name} is required.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const checkForDuplicateTasks = async (title: string) => {
    try {
      const since = new Date();
      since.setDate(since.getDate() - DUPLICATE_LOOKBACK_DAYS);
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, ticket_number, created_at")
        .eq("project_id", projectId)
        .gte("created_at", since.toISOString())
        .ilike("title", title)
        .limit(5);
      if (error) throw error;
      return (data ?? []) as DuplicateCandidate[];
    } catch (error) {
      console.error("Failed to check duplicates", error);
      return [];
    }
  };

  const submitTask = async ({ skipDuplicateCheck = false }: { skipDuplicateCheck?: boolean } = {}) => {
    if (!validateBeforeSubmit()) {
      return;
    }

    if (!skipDuplicateCheck) {
      const duplicates = await checkForDuplicateTasks(formData.title.trim());
      if (duplicates.length) {
        setDuplicateMatches(duplicates);
        toast({
          title: "Possible duplicate",
          description: "We found similar tasks. Review them or create anyway.",
        });
        return;
      }
    }

    const customFieldPayload = buildCustomFieldPayload();
    setLoading(true);

    const offline = typeof navigator !== "undefined" && !navigator.onLine;

    if (offline) {
      try {
        const tempId = crypto.randomUUID();
        await enqueueItemMutation({
          itemId: tempId,
          payload: {
            operation: "task.create",
            projectId,
            title: formData.title.trim(),
            data: {
              description: formData.description,
              priority: formData.priority,
              status: formData.status,
              smartTaskType: formData.smartTaskType,
              assigneeIds,
              watcherIds,
              storyPoints,
              startDate,
              dueDate,
              sprintId,
              customFields: customFieldPayload,
              specialFields: specialFieldValues,
              relationship,
              attachments: attachments.map((file) => ({
                name: file.name,
                size: file.size,
                type: file.type,
              })),
              source,
            },
          },
        });

        domainEventBus.publish({
          type: "item.created",
          payload: {
            id: tempId,
            projectId,
            status: formData.status,
            priority: formData.priority,
            smartTaskType: formData.smartTaskType,
            pending: true,
          },
        });

        toast({
          title: "Saved offline",
          description: attachments.length
            ? "Task queued. Reattach files once you're back online."
            : "Task queued and will sync when you're back online.",
        });

        onTaskCreated?.(tempId, { pending: true });
        resetFormState();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to queue offline task", error);
        toast({
          title: "Offline queue failed",
          description: "We couldn't queue this task. Please try again once you're online.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const selectedOption = SMART_TASK_TYPE_OPTIONS.find((option) => option.id === formData.smartTaskType);
      if (!selectedOption) {
        throw new Error("Invalid task type selected");
      }

      const insertPayload = {
        title: formData.title.trim(),
        description: formData.description,
        priority: formData.priority as "low" | "medium" | "high" | "urgent",
        status: formData.status as "todo" | "in_progress" | "in_review" | "done",
        hierarchy_level: selectedOption.hierarchy_level,
        task_type: selectedOption.task_type,
        project_id: projectId,
        reporter_id: user!.id,
        story_points: storyPoints ? Number(storyPoints) : null,
        start_date: startDate ? startDate : null,
        due_date: dueDate ? dueDate : null,
        sprint_id: sprintId ? sprintId : null,
      };

      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const createdTaskId = newTask?.id;
      await postCreateOperations(createdTaskId, customFieldPayload);

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

      toast({
        title: "Task created",
        description: `Task ${newTask?.ticket_number ?? ""} created successfully`,
      });

      onTaskCreated?.(createdTaskId, { pending: false });
      resetFormState();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to create task", error);
      toast({
        title: "Failed to create task",
        description: error?.message ?? "Something went wrong while saving the task.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitTask();
  };

  const handleCreateDespiteDuplicates = () => {
    setDuplicateMatches([]);
    void submitTask({ skipDuplicateCheck: true });
  };

  const postCreateOperations = async (
    taskId: string | undefined,
    customFieldEntries: TaskCustomFieldValueInput[] = [],
  ) => {
    if (!taskId) return;

    if (assigneeIds.length > 0) {
      const assigneeInserts = assigneeIds.map((id) => ({
        task_id: taskId,
        user_id: id,
        assigned_by: user!.id,
      }));
      const { error: assigneeError } = await supabase.from("task_assignees").upsert(assigneeInserts, {
        onConflict: "task_id,user_id",
      });
      if (assigneeError) {
        console.error("Failed to add assignees", assigneeError);
        toast({
          title: "Assignees",
          description: "Task saved but we couldn't add all assignees.",
          variant: "destructive",
        });
      }
    }

    if (watcherIds.length > 0) {
      try {
        await addTaskWatchers({ taskId, userIds: watcherIds, addedBy: user!.id });
      } catch (error) {
        console.error("Failed to add watchers", error);
        toast({
          title: "Watchers",
          description: "Task saved but watchers could not be updated.",
          variant: "destructive",
        });
      }
    }

    if (attachments.length > 0) {
      try {
        await persistTaskFiles({ taskId, files: attachments, userId: user!.id });
      } catch (error) {
        console.error("Failed to persist attachments", error);
        toast({
          title: "Attachments",
          description: "Task saved but attachments failed to upload.",
          variant: "destructive",
        });
      }
    }

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
        console.error("Failed to create relationship", relError);
        toast({
          title: "Relationship",
          description: "Task saved but we couldn't link the related item.",
          variant: "destructive",
        });
      }
    }

    if (customFieldEntries.length) {
      try {
        await upsertTaskCustomFieldValues(taskId, customFieldEntries);
      } catch (error) {
        console.error("Failed to persist custom fields", error);
        toast({
          title: "Custom fields",
          description: "Task saved but custom fields failed to store.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSmartTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, smartTaskType: value }));
    if (!priorityTouched) {
      const defaultPriority = PRIORITY_BY_TYPE[value] ?? "medium";
      setFormData((prev) => ({ ...prev, priority: defaultPriority }));
    }
  };

  const handlePriorityChange = (value: string) => {
    setPriorityTouched(true);
    setFormData((prev) => ({ ...prev, priority: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : onOpenChange(false))}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col gap-2">
        <DialogHeader>
          <DialogTitle>Create new task</DialogTitle>
          <DialogDescription>
            Provide the essentials, schedule, and any supporting context. You can always refine details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col gap-4">
          <ScrollArea className="flex-1">
            <div className="pr-2 space-y-4 pb-4">
              {duplicateMatches.length > 0 && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>We found similar tasks</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2 mt-2">
                      <p className="text-sm text-muted-foreground">
                        Review these matches before creating a new task. If it's still unique, continue anyway.
                      </p>
                      <ul className="space-y-1 text-sm">
                        {duplicateMatches.map((candidate) => (
                          <li key={candidate.id} className="flex items-center justify-between gap-3">
                            <span className="font-medium">
                              {candidate.ticket_number ? `${candidate.ticket_number} · ` : ""}
                              {candidate.title}
                            </span>
                            {candidate.status && (
                              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                {candidate.status}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setDuplicateMatches([])}>
                          Cancel
                        </Button>
                        <Button type="button" onClick={handleCreateDespiteDuplicates}>
                          Create anyway
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Accordion type="multiple" defaultValue={["essentials", "description"]} className="space-y-3">
                <AccordionItem value="essentials">
                  <AccordionTrigger>Essentials</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="task-title">Title *</Label>
                        <Input
                          id="task-title"
                          value={formData.title}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, title: event.target.value }))
                          }
                          placeholder="Summarize the work to be done"
                          required
                        />
                      </div>

                      <SmartTaskTypeSelector
                        value={formData.smartTaskType}
                        onChange={handleSmartTypeChange}
                        label="Type"
                        placeholder="Choose the type of work..."
                      />

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Priority</Label>
                          <Select value={formData.priority} onValueChange={handlePriorityChange}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[70]">
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
                            onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[70]">
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="in_review">Review</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                            onChange={(event) => setStoryPoints(event.target.value)}
                          />
                        </div>
                      </div>

                      <AssigneeCompanySelect
                        suggestProjectId={projectId}
                        value={watcherIds}
                        onChange={setWatcherIds}
                        label="Watchers"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="description">
                  <AccordionTrigger>Description</AccordionTrigger>
                  <AccordionContent>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
                      placeholder="Capture context, goals, acceptance criteria, and relevant assets"
                      chips={descriptionChips}
                      extensions={[SlashCommandExtension]}
                      minHeight={220}
                      draft={
                        projectId
                          ? {
                              id: `task-create-${projectId}`,
                              scope: "task",
                              entityId: `create-${projectId}`,
                              field: "description",
                              classification: "default",
                            }
                          : null
                      }
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="schedule">
                  <AccordionTrigger>Schedule</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={startDate}
                          onChange={(event) => {
                            setStartDate(event.target.value);
                            setStartDateTouched(true);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="due_date">Due date</Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={dueDate}
                          onChange={(event) => {
                            setDueDate(event.target.value);
                            setDueDateTouched(true);
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <Label htmlFor="sprint">Sprint</Label>
                      <Select value={sprintId} onValueChange={setSprintId}>
                        <SelectTrigger id="sprint">
                          <SelectValue placeholder="Select sprint" />
                        </SelectTrigger>
                        <SelectContent className="z-[70]">
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
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="relations">
                  <AccordionTrigger>Relations & dependencies</AccordionTrigger>
                  <AccordionContent>
                    <RelationshipPicker value={relationship} onChange={setRelationship} projectId={projectId} />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="attachments">
                  <AccordionTrigger>Attachments</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Add files
                        </Button>
                        <p className="text-sm text-muted-foreground">Drag files here or browse from your device</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        onChange={handleAttachmentSelection}
                      />
                      {attachments.length > 0 && (
                        <div className="space-y-2">
                          {attachments.map((file, index) => (
                            <div
                              key={`${file.name}-${file.lastModified}`}
                              className="flex items-center justify-between gap-3 rounded-md border p-2"
                            >
                              <div className="flex items-center gap-2 text-sm">
                                <Paperclip className="h-4 w-4" />
                                <span>{file.name}</span>
                                <span className="text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveAttachment(index)}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="advanced">
                  <AccordionTrigger>Advanced fields</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{SPECIAL_FIELD_CONFIG.fixVersion.label}</Label>
                          <Input
                            value={specialFieldValues.fixVersion}
                            onChange={(event) => handleSpecialFieldChange("fixVersion", event.target.value)}
                            placeholder="e.g. 2024.3.1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{SPECIAL_FIELD_CONFIG.release.label}</Label>
                          <Input
                            value={specialFieldValues.release}
                            onChange={(event) => handleSpecialFieldChange("release", event.target.value)}
                            placeholder="Release stream"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{SPECIAL_FIELD_CONFIG.environment.label}</Label>
                          <Input
                            value={specialFieldValues.environment}
                            onChange={(event) => handleSpecialFieldChange("environment", event.target.value)}
                            placeholder="Production, staging, dev..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{SPECIAL_FIELD_CONFIG.customer.label}</Label>
                          <Input
                            value={specialFieldValues.customer}
                            onChange={(event) => handleSpecialFieldChange("customer", event.target.value)}
                            placeholder="Customer or account"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>{SPECIAL_FIELD_CONFIG.stepsToReproduce.label}</Label>
                          <Input
                            value={specialFieldValues.stepsToReproduce}
                            onChange={(event) => handleSpecialFieldChange("stepsToReproduce", event.target.value)}
                            placeholder="Detailed reproduction steps"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Custom fields</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowCustomFieldWizard(true)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add field
                        </Button>
                      </div>

                      {customFieldsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : visibleCustomFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No custom fields configured yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {visibleCustomFields.map((definition) => (
                            <div key={definition.id} className="space-y-2">
                              <Label>{definition.name}</Label>
                              {renderCustomFieldInput(definition)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>

          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                "Create task"
              )}
            </Button>
          </div>
        </form>

        <InlineCustomFieldWizard
          open={showCustomFieldWizard}
          onOpenChange={(openState) => {
            setShowCustomFieldWizard(openState);
            if (!openState) {
              void refetchCustomFields();
            }
          }}
          projectId={projectId}
          workspaceId={currentWorkspace?.id}
          onCreated={(definition) => {
            toast({ title: `${definition.name} created`, description: "Field is now available in the form." });
            domainEventBus.publish({
              type: "custom-field.created",
              payload: { id: definition.id, projectId },
            });
            void refetchCustomFields();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

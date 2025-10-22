// @ts-nocheck - TODO: Deprecate this dialog in favor of inline editing in TaskView
import { useState, useEffect, useRef, KeyboardEvent, useMemo, useId } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileUpload, UploadedFile } from "@/components/ui/file-upload";
import { SmartTaskTypeSelector, SMART_TASK_TYPE_OPTIONS } from "@/components/tasks/SmartTaskTypeSelector";
import { RichTextEditor } from "@/components/rich-text/RichTextEditor";
import { SafeHtml } from "@/components/ui/safe-html";
import { Task } from "./TaskCard";
import { CalendarIcon, X, User, Paperclip, Check, XCircle, CheckCircle, Link as LinkIcon, Trash2 } from "lucide-react";
import type { ColumnBaseMetadata } from "@/types/boardColumns";
import { evaluateDefinitionChecklists, type ChecklistItemEvaluation } from "@/features/boards/guards";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useToast } from "@/hooks/use-toast";
import { TimeTracker } from "@/components/time-tracking/TimeTracker";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";
import { CommentsSystemWithMentions } from "@/components/comments/CommentsSystemWithMentions";
import { TaskRelationshipsDialog } from "@/components/tasks/TaskRelationshipsDialog";
import { TaskRelationshipIndicator } from "@/components/tasks/TaskRelationshipIndicator";
import { useTaskRelationships } from "@/hooks/useTaskRelationships";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTaskAssignees } from "@/hooks/useTaskAssignees";
import { useProjectMembersView } from "@/hooks/useProjectMembersView";
import AssigneeCompanySelect from "@/components/tasks/AssigneeCompanySelect";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TaskLinkReference, TaskSubitemSummary, TaskRollup, TaskRelationSummary, TaskStatus, TaskPriority } from "@/types/tasks";
import { calculateRollup } from "@/services/tasksService";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomFieldDefinitions, useVisibleCustomFields } from "@/hooks/useCustomFields";
import { isComputedField } from "@/domain/customFields";
import { motion } from "framer-motion";

function getInitials(name?: string | null) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface TaskDialogProps {
  task?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  columnId?: string;
  projectId?: string;
  columnMetadata?: ColumnBaseMetadata;
}

// Helper component for metadata rows
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}

export function TaskDialog({ task, isOpen, onClose, onSave, columnId, projectId, columnMetadata }: TaskDialogProps) {
  const isMobile = useIsMobile();

  const checklistEvaluation = useMemo(() => {
    if (!columnMetadata || !task) return null;
    return evaluateDefinitionChecklists(columnMetadata, task);
  }, [columnMetadata, task]);

  const ChecklistList = ({ title, items }: { title: string; items: ChecklistItemEvaluation[] }) => (
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-xs text-muted-foreground">
            {item.satisfied ? (
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive mt-0.5" />
            )}
            <span className="text-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  // Editing states for inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "P2",
    status: task?.status || "todo",
    smartTaskType: "task",
    parent_id: task?.parent_id || null,
    assignees: task?.assignees || [],
    dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
    tags: task?.tags || [],
    attachments: task?.files || [],
    blocked: task?.blocked || false,
    blocking_reason: task?.blocking_reason || "",
    story_points: task?.story_points || null,
    startDate: task?.start_date ? new Date(task.start_date) : undefined,
    endDate: task?.end_date ? new Date(task.end_date) : undefined,
    estimatedHours: task?.estimated_hours ?? undefined,
    actualHours: task?.actual_hours ?? undefined,
  });

  // Temporary editing states
  const [editedTitle, setEditedTitle] = useState(task?.title || "");
  const [editedDescription, setEditedDescription] = useState(task?.description || "");

  const { members: projectMembers, isLoading: membersLoading } = useProjectMembersView(projectId);
  const [newTag, setNewTag] = useState("");
  const [commentCount, setCommentCount] = useState(task?.comment_count ?? task?.comments ?? 0);
  const [links, setLinks] = useState<TaskLinkReference[]>(task?.links ?? []);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [subitems, setSubitems] = useState<TaskSubitemSummary[]>(task?.subitems ?? []);
  const [subitemRollup, setSubitemRollup] = useState<TaskRollup | undefined>(task?.rollup);
  const [relationSummaries, setRelationSummaries] = useState<TaskRelationSummary[]>(task?.relations ?? []);
  const [showRelationships, setShowRelationships] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const { uploadFile, deleteFile, isUploading } = useFileUpload();
  const { toast } = useToast();
  const { user } = useAuth();
  const { relationships } = useTaskRelationships(task?.id);
  const { assignees: currentAssignees, addAssignee, removeAssignee, fetchAssignees, updateAssignees, loading: assigneesLoading } = useTaskAssignees(task?.id);

  const [savingAssignee, setSavingAssignee] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [savingStoryPoints, setSavingStoryPoints] = useState(false);
  const { isAdmin } = useIsAdmin();
  const [projectOwnerId, setProjectOwnerId] = useState<string | null>(null);

  const {
    definitions: customFieldDefinitions,
    defaults: customFieldDefaults,
    isLoading: customFieldsLoading,
  } = useCustomFieldDefinitions({ projectId, contexts: ["tasks", "boards", "forms"] });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const initial: Record<string, unknown> = { ...customFieldDefaults };
    if (task?.custom_fields && typeof task.custom_fields === "object") {
      Object.assign(initial, task.custom_fields as Record<string, unknown>);
    }
    setCustomFieldValues(initial);
  }, [task?.id, task?.custom_fields, customFieldDefaults]);

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
              <SelectContent className="z-[80]">
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

  const combinedRelations = useMemo(() => {
    const relationMap = new Map<string, TaskRelationSummary>();
    relationSummaries.forEach(rel => {
      relationMap.set(`${rel.id}-${rel.direction}`, rel);
    });

    relationships.forEach(rel => {
      const direction: "incoming" | "outgoing" = rel.source_task_id === task?.id ? "outgoing" : "incoming";
      const relatedTaskId = direction === "outgoing" ? rel.target_task_id : rel.source_task_id;
      const relatedTaskTitle = direction === "outgoing" ? rel.target_task_title : rel.source_task_title;
      const relatedTaskStatus = direction === "outgoing" ? rel.target_task_status : rel.source_task_status;
      relationMap.set(`${rel.id}-${direction}`, {
        id: rel.id,
        type: rel.relationship_type,
        direction,
        relatedTaskId: relatedTaskId || "",
        relatedTaskTitle: relatedTaskTitle || undefined,
        relatedTaskStatus: (relatedTaskStatus as TaskStatus | undefined) ?? undefined,
      });
    });

    return Array.from(relationMap.values());
  }, [relationSummaries, relationships, task?.id]);

  useEffect(() => {
    const fetchOwner = async () => {
      if (!projectId) return;
      const { data, error } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .maybeSingle();
      if (!error) setProjectOwnerId(data?.owner_id || null);
    };
    fetchOwner();
  }, [projectId]);

  const canManageMembers = !!user && (isAdmin || projectOwnerId === user.id);

  const addUserToProject = async (userIdToAdd: string) => {
    if (!projectId) return;
    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: userIdToAdd,
    });
    if (error) {
      toast({ title: 'Could not add to project', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Added to project', description: 'User can now access this project.' });
    }
  };

  const handleAddAssignee = async (userIdToAdd: string) => {
    if (!task?.id) return;
    try {
      setSavingAssignee(userIdToAdd);
      await addAssignee(userIdToAdd);
      await fetchAssignees();

      // If not a project member, optionally add
      const isMember = projectMembers.some((m) => m.user_id === userIdToAdd);
      if (!isMember) {
        if (canManageMembers) {
          toast({
            title: 'Assigned outside project',
            description: 'They may not see this task. Adding them to the project...',
          });
          await addUserToProject(userIdToAdd);
        } else {
          toast({
            title: 'Assigned outside project',
            description: 'They might not see this task until a project owner adds them to the project.',
          });
        }
      }
    } finally {
      setSavingAssignee(null);
    }
  };

  const createTempId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleAddLink = () => {
    const trimmedUrl = newLinkUrl.trim();
    if (!trimmedUrl) {
      toast({ title: "Missing URL", description: "Provide a valid link before adding.", variant: "destructive" });
      return;
    }

    const entry: TaskLinkReference = {
      id: createTempId(),
      url: trimmedUrl,
      title: newLinkTitle.trim() || undefined,
      linkType: undefined,
      createdAt: new Date().toISOString(),
      createdBy: user?.id ?? undefined,
    };
    setLinks(prev => [...prev, entry]);
    setNewLinkTitle("");
    setNewLinkUrl("");
  };

  const handleRemoveLink = (linkId: string) => {
    setLinks(prev => prev.filter(link => link.id !== linkId));
  };

  const handleToggleSubitem = async (subitemId: string, completed: boolean) => {
    const nextStatus = completed ? "todo" : "done";
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', subitemId);

      if (error) throw error;

      setSubitems(prev => {
        const updated = prev.map(item =>
          item.id === subitemId
            ? { ...item, completed: !completed, status: nextStatus as TaskStatus }
            : item
        );
        setSubitemRollup(calculateRollup(updated) ?? undefined);
        return updated;
      });
    } catch (error: any) {
      console.error('Failed to update subitem status', error);
      toast({ title: 'Error', description: 'Failed to update subitem status', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (task?.id) {
      setFormData(prev => ({
        ...prev,
        assignees: currentAssignees.map(a => ({ id: a.id, name: a.name, avatar: a.avatar, initials: a.initials }))
      }));
    }
  }, [currentAssignees, task?.id]);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Find the smart task type based on hierarchy_level and task_type
        const smartTaskType = SMART_TASK_TYPE_OPTIONS.find(option =>
          option.hierarchy_level === task.hierarchy_level &&
          option.task_type === task.task_type
        )?.id || "task";

        setFormData({
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          smartTaskType,
          parent_id: task.parent_id || null,
          assignees: task.assignees || [],
          dueDate: task.due_date ? new Date(task.due_date) : task.dueDate ? new Date(task.dueDate) : undefined,
          tags: task.tags || [],
          attachments: task.files || [],
          blocked: task.blocked || false,
          blocking_reason: task.blocking_reason || "",
          story_points: task.story_points || null,
          startDate: task.start_date ? new Date(task.start_date) : undefined,
          endDate: task.end_date ? new Date(task.end_date) : undefined,
          estimatedHours: task.estimated_hours ?? undefined,
          actualHours: task.actual_hours ?? undefined,
        });
        setLinks(task.links ?? []);
        setSubitems(task.subitems ?? []);
        setSubitemRollup(task.rollup);
        setRelationSummaries(task.relations ?? []);
        setCommentCount(task.comment_count ?? task.comments ?? 0);
        setNewLinkTitle("");
        setNewLinkUrl("");
      }
      if (!task) {
        setLinks([]);
        setSubitems([]);
        setSubitemRollup(undefined);
        setRelationSummaries([]);
        setCommentCount(0);
        setFormData({
          title: "",
          description: "",
          priority: "P2",
          status: "todo",
          smartTaskType: "task",
          parent_id: null,
          assignees: [],
          dueDate: undefined,
          tags: [],
          attachments: [],
          blocked: false,
          blocking_reason: "",
          story_points: null,
          startDate: undefined,
          endDate: undefined,
          estimatedHours: undefined,
          actualHours: undefined,
        });
      }
    }
  }, [isOpen, task]);

  const handleSave = () => {
    // Get the selected smart task type option
    const selectedOption = SMART_TASK_TYPE_OPTIONS.find(option => option.id === formData.smartTaskType);
    if (!selectedOption) {
      toast({
        title: "Error",
        description: "Invalid task type selected",
        variant: "destructive",
      });
      return;
    }

    const taskData: Partial<Task> & { assignee_id?: string; due_date?: string; hierarchy_level?: string; task_type?: string; parent_id?: string; blocked?: boolean; blocking_reason?: string; story_points?: number | null } = {
      ...formData,
      id: task?.id || `task-${Date.now()}`,
      status: formData.status || columnId || task?.status || "todo",
      dueDate: formData.dueDate ? format(formData.dueDate, "MMM dd") : undefined,
      assignees: formData.assignees,
      due_date: formData.dueDate ? formData.dueDate.toISOString() : null,
      start_date: formData.startDate ? formData.startDate.toISOString() : null,
      end_date: formData.endDate ? formData.endDate.toISOString() : null,
      estimated_hours: formData.estimatedHours ?? null,
      actual_hours: formData.actualHours ?? null,
      hierarchy_level: selectedOption.hierarchy_level,
      task_type: selectedOption.task_type,
      parent_id: formData.parent_id,
      comments: commentCount,
      comment_count: commentCount,
      attachments: Array.isArray(formData.attachments) ? formData.attachments.length : (task?.attachments || 0),
      attachment_count: Array.isArray(formData.attachments) ? formData.attachments.length : (task?.attachment_count ?? task?.attachments ?? 0),
      blocked: formData.blocked,
      blocking_reason: formData.blocked ? formData.blocking_reason : null,
      story_points: formData.story_points,
      custom_fields: customFieldValues,
      links,
      subitems,
      rollup: subitemRollup,
      relations: combinedRelations,
    };

    onSave(taskData);
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    if (!task?.id && !columnId) {
      toast({
        title: "Error",
        description: "Please save the task first before uploading files.",
        variant: "destructive",
      });
      return;
    }

    try {
      const taskId = task?.id || `task-${Date.now()}`;
      const fileUrl = await uploadFile(file, taskId);
      
      if (fileUrl) {
        const newAttachment = {
          id: `attachment-${Date.now()}`,
          name: file.name,
          size: file.size,
          url: fileUrl,
          uploadedAt: new Date().toISOString(),
        };

        setFormData(prev => ({
          ...prev,
          attachments: [...(Array.isArray(prev.attachments) ? prev.attachments : []), newAttachment]
        }));

        toast({
          title: "Success",
          description: "File uploaded successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileRemove = async (attachmentId: string) => {
    const attachment = Array.isArray(formData.attachments) 
      ? formData.attachments.find((a: any) => a.id === attachmentId)
      : null;
    
    if (attachment) {
      try {
        // Extract file path from URL for deletion
        const urlParts = attachment.url.split('/');
        const filePath = urlParts.slice(-2).join('/'); // Get taskId/filename
        await deleteFile(filePath);
        
        setFormData(prev => ({
          ...prev,
          attachments: Array.isArray(prev.attachments) 
            ? prev.attachments.filter((a: any) => a.id !== attachmentId)
            : []
        }));

        toast({
          title: "Success",
          description: "File removed successfully!",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to remove file. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Inline editing handlers for title
  const cancelTitle = () => {
    setEditedTitle(task?.title || "");
    setIsEditingTitle(false);
  };

  const saveTitle = () => {
    if (editedTitle.trim() && editedTitle !== task?.title) {
      setFormData(prev => ({ ...prev, title: editedTitle.trim() }));
    }
    setIsEditingTitle(false);
  };

  const onTitleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') saveTitle();
    if (e.key === 'Escape') cancelTitle();
  };

  // Inline editing handlers for description
  const cancelDescription = () => {
    setEditedDescription(task?.description || "");
    setIsEditingDescription(false);
  };

  const saveDescription = () => {
    if (editedDescription !== task?.description) {
      setFormData(prev => ({ ...prev, description: editedDescription }));
    }
    setIsEditingDescription(false);
  };

  const titleId = useId();
  const descriptionId = useId();
  const brandThemeStyles = useMemo(
    () => ({
      "--background": "208 100% 12%",
      "--foreground": "0 0% 100%",
      "--card": "208 70% 18%",
      "--card-foreground": "0 0% 100%",
      "--muted": "208 60% 20%",
      "--muted-foreground": "210 40% 85%",
      "--border": "210 60% 28%",
      "--input": "208 60% 20%",
      "--ring": "220 100% 61%",
      "--primary": "25 100% 50%",
      "--primary-foreground": "0 0% 100%",
      "--accent": "220 100% 61%",
      "--accent-foreground": "0 0% 100%",
      "--popover": "208 70% 18%",
      "--popover-foreground": "0 0% 100%",
    }),
    []
  );
  const focusRingClass = "focus-visible:ring-[#3778FF] focus-visible:ring-offset-0 focus-visible:outline-none";
  const brandInputClasses = "bg-white/5 border-white/20 text-white placeholder:text-white/50";
  const brandSelectTriggerClasses = "border-white/20 bg-white/10 text-white";
  const brandPrimaryButtonClasses = "bg-[#FF6A00] text-white hover:bg-[#e85f00]";
  const brandSecondaryButtonClasses = "border-[#0a2a4a] text-white hover:bg-white/10";
  const brandGhostButtonClasses = "text-white hover:bg-white/10";
  const brandSurfaceClasses = "rounded-xl border border-white/10 bg-white/5";

  return (
    <Sheet open={isOpen} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex h-[100svh] w-full flex-col overflow-hidden border-l border-white/10 p-0 text-foreground shadow-[0_20px_60px_-20px_rgba(5,26,46,0.65)]",
          isMobile ? "max-h-[100svh]" : "sm:max-w-5xl"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={`${descriptionId}-details`}
        style={brandThemeStyles}
      >
        <motion.div
          initial={{ x: isMobile ? 0 : 56, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="flex h-full flex-col"
        >
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#051A2E]/95 px-4 py-4 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p id={descriptionId} className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
                    {task?.project?.code && task?.ticket_number
                      ? `${task.project.code}-${task.ticket_number}`
                      : task?.id?.slice(0, 8) || "New task"}
                  </p>
                  {isEditingTitle ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        ref={titleInputRef}
                        value={editedTitle}
                        onChange={(event) => setEditedTitle(event.target.value)}
                        onKeyDown={onTitleKey}
                        className={cn("text-2xl font-semibold", brandInputClasses, focusRingClass)}
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={saveTitle}
                        className={cn("h-8 w-8", brandGhostButtonClasses, focusRingClass)}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Save title</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelTitle}
                        className={cn("h-8 w-8", brandGhostButtonClasses, focusRingClass)}
                      >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Cancel editing title</span>
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditedTitle(formData.title);
                        setIsEditingTitle(true);
                        setTimeout(() => titleInputRef.current?.focus(), 0);
                      }}
                      className={cn(
                        "mt-2 w-full text-left text-2xl font-semibold text-white transition hover:text-primary",
                        focusRingClass
                      )}
                      id={titleId}
                    >
                      {formData.title || "Untitled Task"}
                    </button>
                  )}
                  {task?.id ? (
                    <div className="mt-2 flex items-center gap-3 text-xs text-white/70">
                      <TaskRelationshipIndicator taskId={task.id} compact />
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" aria-hidden="true" />
                        {currentAssignees.length > 0
                          ? `${currentAssignees.length} assignee${currentAssignees.length > 1 ? "s" : ""}`
                          : "Unassigned"}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: value,
                        blocked: value === "blocked",
                      }))
                    }
                  >
                    <SelectTrigger
                      className={cn("w-[140px] justify-between", brandSelectTriggerClasses, focusRingClass)}
                      aria-label="Task status"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-white/10 bg-[#0B2A45] text-white">
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className={cn("h-10 w-10", brandGhostButtonClasses, focusRingClass)}
                    aria-label="Close task drawer"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <p className="sr-only" id={`${descriptionId}-details`}>
            Manage task details, subtasks, comments, and files from this drawer.
          </p>

          <div className="flex-1 px-4 pt-3 sm:px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
              <TabsList className="flex w-full gap-1 rounded-lg bg-white/10 p-1 text-white">
                <TabsTrigger
                  value="details"
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium text-white transition data-[state=active]:bg-white/20 data-[state=active]:shadow-sm",
                    focusRingClass
                  )}
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="subtasks"
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium text-white transition data-[state=active]:bg-white/20 data-[state=active]:shadow-sm",
                    focusRingClass
                  )}
                >
                  Subtasks
                </TabsTrigger>
                <TabsTrigger
                  value="comments"
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium text-white transition data-[state=active]:bg-white/20 data-[state=active]:shadow-sm",
                    focusRingClass
                  )}
                >
                  Comments
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium text-white transition data-[state=active]:bg-white/20 data-[state=active]:shadow-sm",
                    focusRingClass
                  )}
                >
                  Files
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 flex-1 overflow-hidden">
                <TabsContent
                  value="details"
                  className="mt-0 flex h-full flex-col overflow-hidden px-0 data-[state=inactive]:hidden"
                >
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6 pb-12">
                      <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                        <div>
                          <h3 className="text-base font-semibold text-white">Overview</h3>
                          <p className="text-xs text-white/70">Capture the story behind the task.</p>
                        </div>
                        {isEditingDescription ? (
                          <div className="space-y-3">
                            <RichTextEditor
                              value={editedDescription}
                              onChange={setEditedDescription}
                              placeholder="Describe the task..."
                              className="min-h-[200px]"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                onClick={saveDescription}
                                className={cn(brandPrimaryButtonClasses, focusRingClass)}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                onClick={cancelDescription}
                                className={cn(brandSecondaryButtonClasses, focusRingClass)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditedDescription(formData.description);
                              setIsEditingDescription(true);
                            }}
                            className="cursor-text rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80 transition hover:bg-white/10"
                          >
                            {formData.description ? (
                              <SafeHtml html={formData.description} />
                            ) : (
                              <p className="text-sm text-white/70">Click to add a description...</p>
                            )}
                          </div>
                        )}
                      </section>

                      <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                        <div>
                          <h3 className="text-base font-semibold text-white">Task information</h3>
                          <p className="text-xs text-white/70">Keep status, scheduling, and effort aligned.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-white/70">Status</Label>
                            <Select
                              value={formData.status}
                              onValueChange={(value) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  status: value,
                                  blocked: value === "blocked",
                                }))
                              }
                            >
                              <SelectTrigger className={cn("mt-2", brandSelectTriggerClasses, focusRingClass)}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border border-white/10 bg-[#0B2A45] text-white">
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="in_review">In Review</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                                <SelectItem value="blocked">Blocked</SelectItem>
                                <SelectItem value="waiting">Waiting</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-white/70">Priority</Label>
                            <Select
                              value={formData.priority}
                              onValueChange={(value) =>
                                setFormData((prev) => ({ ...prev, priority: value as TaskPriority }))
                              }
                            >
                              <SelectTrigger className={cn("mt-2", brandSelectTriggerClasses, focusRingClass)}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border border-white/10 bg-[#0B2A45] text-white">
                                <SelectItem value="P0">Critical (P0)</SelectItem>
                                <SelectItem value="P1">High (P1)</SelectItem>
                                <SelectItem value="P2">Medium (P2)</SelectItem>
                                <SelectItem value="P3">Low (P3)</SelectItem>
                                <SelectItem value="P4">Lowest (P4)</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-white/70">Start date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "mt-2 w-full justify-start text-left text-sm",
                                    brandSecondaryButtonClasses,
                                    focusRingClass,
                                    !formData.startDate && "text-white/60"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                                  {formData.startDate ? format(formData.startDate, "PPP") : "Pick start date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto border border-white/10 bg-[#0B2A45] p-0 text-white" align="start">
                                <Calendar
                                  mode="single"
                                  selected={formData.startDate}
                                  onSelect={(date) => setFormData((prev) => ({ ...prev, startDate: date }))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-white/70">Due date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "mt-2 w-full justify-start text-left text-sm",
                                    brandSecondaryButtonClasses,
                                    focusRingClass,
                                    !formData.dueDate && "text-white/60"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                                  {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick due date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto border border-white/10 bg-[#0B2A45] p-0 text-white" align="start">
                                <Calendar
                                  mode="single"
                                  selected={formData.dueDate}
                                  onSelect={(date) => setFormData((prev) => ({ ...prev, dueDate: date }))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-white/70">End date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "mt-2 w-full justify-start text-left text-sm",
                                    brandSecondaryButtonClasses,
                                    focusRingClass,
                                    !formData.endDate && "text-white/60"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                                  {formData.endDate ? format(formData.endDate, "PPP") : "Pick end date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto border border-white/10 bg-[#0B2A45] p-0 text-white" align="start">
                                <Calendar
                                  mode="single"
                                  selected={formData.endDate}
                                  onSelect={(date) => setFormData((prev) => ({ ...prev, endDate: date }))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-white/70">Estimated hours</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.25"
                              value={formData.estimatedHours ?? ""}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  estimatedHours: event.target.value ? Number(event.target.value) : undefined,
                                }))
                              }
                              className={cn("mt-2", brandInputClasses, focusRingClass)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-white/70">Actual hours</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.25"
                              value={formData.actualHours ?? ""}
                              onChange={(event) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  actualHours: event.target.value ? Number(event.target.value) : undefined,
                                }))
                              }
                              className={cn("mt-2", brandInputClasses, focusRingClass)}
                            />
                          </div>
                        </div>
                        {(formData.blocked || formData.status === "blocked") && (
                          <div>
                            <Label className="text-xs uppercase tracking-wide text-white/70">Blocking reason</Label>
                            <Textarea
                              value={formData.blocking_reason}
                              onChange={(event) =>
                                setFormData((prev) => ({ ...prev, blocking_reason: event.target.value }))
                              }
                              placeholder="Explain what is preventing progress"
                              className={cn("mt-2 min-h-[100px]", brandInputClasses, focusRingClass)}
                            />
                          </div>
                        )}
                        <div>
                          <SmartTaskTypeSelector
                            value={formData.smartTaskType}
                            onChange={(value) => setFormData((prev) => ({ ...prev, smartTaskType: value }))}
                          />
                        </div>
                      </section>

                      {customFieldsLoading ? (
                        <section className={cn(brandSurfaceClasses, "p-5 space-y-3")}> 
                          <h3 className="text-base font-semibold text-white">Custom fields</h3>
                          {[0, 1, 2].map((index) => (
                            <Skeleton key={index} className="h-10 w-full rounded-md bg-white/10" />
                          ))}
                        </section>
                      ) : visibleCustomFields.length > 0 ? (
                        <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                          <div>
                            <h3 className="text-base font-semibold text-white">Custom fields</h3>
                            <p className="text-xs text-white/70">Support governance and automation across boards and reports.</p>
                          </div>
                          {visibleCustomFields.map((definition) => (
                            <div key={definition.id} className="space-y-1.5">
                              <Label className="text-xs uppercase tracking-wide text-white/70">
                                {definition.name}
                                {definition.isRequired ? <span className="ml-1 text-destructive">*</span> : null}
                              </Label>
                              {renderCustomFieldInput(definition)}
                              {definition.description ? (
                                <p className="text-xs text-white/60">{definition.description}</p>
                              ) : null}
                            </div>
                          ))}
                        </section>
                      ) : null}

                      <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                        <div>
                          <h3 className="text-base font-semibold text-white">Tags</h3>
                          <p className="text-xs text-white/70">Use tags to cluster similar work and improve search.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            value={newTag}
                            onChange={(event) => setNewTag(event.target.value)}
                            placeholder="Add tag"
                            className={cn("max-w-xs", brandInputClasses, focusRingClass)}
                          />
                          <Button
                            onClick={addTag}
                            className={cn(brandSecondaryButtonClasses, focusRingClass)}
                            variant="outline"
                          >
                            Add
                          </Button>
                        </div>
                        {formData.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {formData.tags.map((tag) => (
                              <Badge key={tag} className="bg-white/10 text-white">
                                <span className="mr-2">{tag}</span>
                                <button
                                  type="button"
                                  onClick={() => removeTag(tag)}
                                  className={cn("ml-auto text-white/70", focusRingClass)}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-white/70">No tags yet.</p>
                        )}
                      </section>

                      <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                        <div>
                          <h3 className="text-base font-semibold text-white">Assignees</h3>
                          <p className="text-xs text-white/70">Invite collaborators or hand off work instantly.</p>
                        </div>
                        <AssigneeCompanySelect
                          value={currentAssignees.map((assignee) => assignee.id)}
                          onChange={() => {}}
                          onSelectOne={handleAddAssignee}
                          suggestProjectId={projectId}
                        />
                        {currentAssignees.length > 0 ? (
                          <div className="space-y-2">
                            {currentAssignees.map((assignee) => (
                              <div key={assignee.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8 border border-white/10">
                                    <AvatarImage src={assignee.avatar || ""} alt={assignee.name} />
                                    <AvatarFallback className="text-xs text-white">
                                      {getInitials(assignee.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium text-white">{assignee.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeAssignee(assignee.id)}
                                  className={cn("h-8 w-8", brandGhostButtonClasses, focusRingClass)}
                                >
                                  <X className="h-4 w-4" aria-hidden="true" />
                                  <span className="sr-only">Remove assignee</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-white/70">Assign someone to drive this work forward.</p>
                        )}
                      </section>

                      <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-white">Relationships</h3>
                            <p className="text-xs text-white/70">Understand dependencies and blockers at a glance.</p>
                          </div>
                          {task?.id ? <TaskRelationshipIndicator taskId={task.id} /> : null}
                        </div>
                        {combinedRelations.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {combinedRelations.map((relation) => (
                              <Badge
                                key={`${relation.id}-${relation.direction}`}
                                variant="secondary"
                                className="bg-white/10 capitalize text-white"
                              >
                                {relation.direction === "incoming" ? "⬅" : "➡"} {relation.type.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-white/70">No linked work yet.</p>
                        )}
                        <div>
                          {task?.id ? (
                            <TaskRelationshipsDialog taskId={task.id} taskTitle={formData.title}>
                              <Button className={cn(brandSecondaryButtonClasses, focusRingClass)} variant="outline">
                                Manage relationships
                              </Button>
                            </TaskRelationshipsDialog>
                          ) : (
                            <p className="text-sm text-white/70">Save the task to manage relationships.</p>
                          )}
                        </div>
                      </section>

                      {task?.id ? (
                        <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                          <div>
                            <h3 className="text-base font-semibold text-white">Time tracking</h3>
                            <p className="text-xs text-white/70">Log new entries and review previous time tracked.</p>
                          </div>
                          <TimeTracker taskId={task.id} taskTitle={formData.title} />
                          <TimeEntriesList taskId={task.id} />
                        </section>
                      ) : null}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent
                  value="subtasks"
                  className="mt-0 flex h-full flex-col overflow-hidden px-0 data-[state=inactive]:hidden"
                >
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6 pb-12">
                      <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-base font-semibold text-white">Subitems</h3>
                          {subitemRollup ? (
                            <div className="flex items-center gap-2 text-xs text-white/70">
                              <span>{subitemRollup.completed}/{subitemRollup.total}</span>
                              <Progress value={Math.round((subitemRollup.progress ?? 0) * 100)} className="h-1.5 w-24" />
                            </div>
                          ) : null}
                        </div>
                        {subitems.length > 0 ? (
                          <div className="space-y-2">
                            {subitems.map((subitem) => (
                              <div key={subitem.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={subitem.completed || subitem.status === "done"}
                                    onCheckedChange={() => handleToggleSubitem(subitem.id, subitem.completed || subitem.status === "done")}
                                  />
                                  <span className="text-sm text-white">{subitem.title}</span>
                                </div>
                                <Badge variant="outline" className="text-xs capitalize text-white">
                                  {subitem.status.replace("_", " ")}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-white/70">No subitems yet.</p>
                        )}
                      </section>

                      {checklistEvaluation ? (
                        <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                          <h3 className="text-base font-semibold text-white">Workflow checklists</h3>
                          <ChecklistList title="Definition of Ready" items={checklistEvaluation.ready} />
                          <ChecklistList title="Definition of Done" items={checklistEvaluation.done} />
                        </section>
                      ) : null}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent
                  value="comments"
                  className="mt-0 flex h-full flex-col overflow-hidden px-0 data-[state=inactive]:hidden"
                >
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4 pb-12">
                      {task?.id ? (
                        <CommentsSystemWithMentions
                          entityType="task"
                          entityId={task.id}
                          projectId={projectId}
                          onCountChange={setCommentCount}
                        />
                      ) : (
                        <div className={cn(brandSurfaceClasses, "p-5 text-sm text-white/70")}>Save the task to start the conversation.</div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent
                  value="files"
                  className="mt-0 flex h-full flex-col overflow-hidden px-0 data-[state=inactive]:hidden"
                >
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6 pb-12">
                      <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                        <div>
                          <h3 className="text-base font-semibold text-white">Attachments</h3>
                          <p className="text-xs text-white/70">Upload supporting docs, visuals, or specs.</p>
                        </div>
                        <FileUpload onFileUpload={handleFileUpload} disabled={isUploading} />
                        {Array.isArray(formData.attachments) && formData.attachments.length > 0 ? (
                          <div className="space-y-2">
                            {formData.attachments.map((attachment: UploadedFile) => (
                              <div key={attachment.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                                <div className="flex items-center gap-2 text-sm text-white">
                                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                                  <span>{attachment.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleFileRemove(attachment.id)}
                                  className={cn("h-8 w-8", brandGhostButtonClasses, focusRingClass)}
                                >
                                  <X className="h-4 w-4" aria-hidden="true" />
                                  <span className="sr-only">Remove attachment</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-white/70">No files have been added yet.</p>
                        )}
                      </section>

                      <section className={cn(brandSurfaceClasses, "p-5 space-y-4")}> 
                        <div>
                          <h3 className="text-base font-semibold text-white">Links</h3>
                          <p className="text-xs text-white/70">Reference docs, tickets, or external resources.</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={newLinkTitle}
                            onChange={(event) => setNewLinkTitle(event.target.value)}
                            placeholder="Link title"
                            className={cn(brandInputClasses, focusRingClass)}
                          />
                          <Input
                            value={newLinkUrl}
                            onChange={(event) => setNewLinkUrl(event.target.value)}
                            placeholder="https://example.com"
                            className={cn(brandInputClasses, focusRingClass)}
                          />
                          <Button onClick={handleAddLink} className={cn(brandPrimaryButtonClasses, focusRingClass)}>
                            Add
                          </Button>
                        </div>
                        {links.length > 0 ? (
                          <div className="space-y-2">
                            {links.map((link) => (
                              <div key={link.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 text-sm text-white hover:text-primary"
                                >
                                  <LinkIcon className="h-4 w-4" aria-hidden="true" />
                                  <span>{link.title || link.url}</span>
                                </a>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveLink(link.id)}
                                  className={cn("h-8 w-8", brandGhostButtonClasses, focusRingClass)}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  <span className="sr-only">Remove link</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-white/70">No links added yet.</p>
                        )}
                      </section>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <footer className="border-t border-white/10 bg-[#051A2E]/95 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className={cn(brandSecondaryButtonClasses, focusRingClass)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className={cn(brandPrimaryButtonClasses, focusRingClass)}
              >
                {task ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </footer>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}

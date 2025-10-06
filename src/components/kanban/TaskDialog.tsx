import { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { SafeHtml } from "@/components/ui/safe-html";
import { Task } from "./TaskCard";
import { CalendarIcon, X, User, Tag, MessageSquare, Paperclip, GitBranch, Check, XCircle } from "lucide-react";
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

export function TaskDialog({ task, isOpen, onClose, onSave, columnId, projectId }: TaskDialogProps) {
  const isMobile = useIsMobile();
  
  // Editing states for inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "medium",
    status: task?.status || "todo",
    smartTaskType: "task",
    parent_id: task?.parent_id || null,
    assignees: task?.assignees || [],
    dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
    tags: task?.tags || [],
    attachments: task?.attachments || [],
    blocked: task?.blocked || false,
    blocking_reason: task?.blocking_reason || "",
    story_points: task?.story_points || null,
  });

  // Temporary editing states
  const [editedTitle, setEditedTitle] = useState(task?.title || "");
  const [editedDescription, setEditedDescription] = useState(task?.description || "");

  const { members: projectMembers, isLoading: membersLoading } = useProjectMembersView(projectId);
  const [newTag, setNewTag] = useState("");
  const [commentCount, setCommentCount] = useState(0);
  const [showRelationships, setShowRelationships] = useState(false);
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
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          tags: task.tags || [],
          attachments: task.attachments || [],
          blocked: task.blocked || false,
          blocking_reason: task.blocking_reason || "",
          story_points: task.story_points || null,
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
      hierarchy_level: selectedOption.hierarchy_level,
      task_type: selectedOption.task_type,
      parent_id: formData.parent_id,
      comments: commentCount,
      attachments: Array.isArray(formData.attachments) ? formData.attachments.length : (task?.attachments || 0),
      blocked: formData.blocked,
      blocking_reason: formData.blocked ? formData.blocking_reason : null,
      story_points: formData.story_points,
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'hsl(var(--destructive))';
      case 'high': return 'hsl(var(--destructive) / 0.8)';
      case 'medium': return 'hsl(var(--warning))';
      case 'low': return 'hsl(var(--success))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'hsl(var(--success))';
      case 'in_progress': return 'hsl(var(--primary))';
      case 'in_review': return 'hsl(var(--warning))';
      default: return 'hsl(var(--muted))';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-5xl h-[90svh] overflow-hidden bg-card border border-border p-0 flex flex-col",
        isMobile ? "w-full" : "md:max-h-[90vh]"
      )}>
        <DialogTitle className="sr-only">
          {task ? `Edit Task: ${formData.title}` : 'Create New Task'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {task ? 'Edit task details, assignees, and manage comments' : 'Create a new task with details and assignees'}
        </DialogDescription>

        {/* Header - Fixed */}
        <div className="flex justify-between items-start px-4 md:px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1 font-mono">
              {task?.project?.code && task?.ticket_number 
                ? `${task.project.code}-${task.ticket_number}`
                : task?.id?.slice(0, 8) || 'NEW'
              }
            </p>
            
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={titleInputRef}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={onTitleKey}
                  className="text-lg md:text-xl font-semibold bg-background border-input"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={saveTitle}
                  className="p-1 h-auto text-primary shrink-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelTitle}
                  className="p-1 h-auto text-muted-foreground shrink-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h1
                onClick={() => {
                  setEditedTitle(formData.title);
                  setIsEditingTitle(true);
                  setTimeout(() => titleInputRef.current?.focus(), 0);
                }}
                className="text-lg md:text-xl font-semibold text-foreground hover:bg-accent/50 rounded px-2 py-1 -mx-2 cursor-text line-clamp-2"
              >
                {formData.title || "Untitled Task"}
              </h1>
            )}
          </div>
        </div>

        {/* Main Content - Single Scroll Container */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 md:p-6 space-y-6">
            {/* Mobile: Single column layout */}
            {isMobile ? (
              <div className="space-y-6">
                {/* Task Info Section */}
                <section className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="in_review">In Review</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                      <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as "low" | "medium" | "high" | "urgent" }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Assignees */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">Assignees</Label>
                    <AssigneeCompanySelect
                      value={currentAssignees.map(a => a.id)}
                      onChange={(ids) => {}} // Not used, using onSelectOne instead
                      onSelectOne={handleAddAssignee}
                      suggestProjectId={projectId}
                    />
                    {currentAssignees.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {currentAssignees.map((assignee) => (
                          <div key={assignee.id} className="flex items-center gap-2 bg-accent/50 rounded-full px-2 py-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={assignee.avatar || ""} />
                              <AvatarFallback className="text-xs">
                                {getInitials(assignee.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{assignee.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive/20"
                              onClick={() => removeAssignee(assignee.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn("w-full mt-1 justify-start text-left font-normal", !formData.dueDate && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dueDate}
                          onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </section>

                {/* Description */}
                <section>
                  <h3 className="text-lg font-medium text-foreground mb-3">Description</h3>
                  
                  {isEditingDescription ? (
                    <div className="space-y-3">
                      <RichTextEditor
                        value={editedDescription}
                        onChange={setEditedDescription}
                        placeholder="Describe the task..."
                        className="min-h-[200px]"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={saveDescription}
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={cancelDescription}
                          size="sm"
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
                      className="min-h-[100px] p-4 rounded-md border border-input bg-background hover:bg-accent/30 cursor-text transition-colors"
                    >
                      {formData.description ? (
                        <SafeHtml html={formData.description} />
                      ) : (
                        <p className="text-muted-foreground">Click to add a description...</p>
                      )}
                    </div>
                  )}
                </section>

                {/* Attachments */}
                <section>
                  <h3 className="text-lg font-medium text-foreground mb-3">Attachments</h3>
                  <FileUpload
                    onFileUpload={handleFileUpload}
                    disabled={isUploading}
                    className="mb-4"
                  />
                  {Array.isArray(formData.attachments) && formData.attachments.length > 0 && (
                    <div className="space-y-2">
                      {formData.attachments.map((attachment: any) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 bg-accent/50 rounded">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{attachment.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileRemove(attachment.id)}
                            className="h-8 w-8 p-0 hover:bg-destructive/20"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Time Tracking */}
                {task?.id && (
                  <section>
                    <h3 className="text-lg font-medium text-foreground mb-3">Time Tracking</h3>
                    <div className="space-y-4">
                      <TimeTracker taskId={task.id} taskTitle={formData.title} />
                      <TimeEntriesList taskId={task.id} />
                    </div>
                  </section>
                )}

                {/* Comments */}
                {task?.id && (
                  <section>
                    <h3 className="text-lg font-medium text-foreground mb-3">Comments</h3>
                    <CommentsSystemWithMentions
                      entityType="task"
                      entityId={task.id}
                      projectId={projectId}
                      onCountChange={setCommentCount}
                    />
                  </section>
                )}
              </div>
            ) : (
              /* Desktop: Two column layout */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <section>
                    <h3 className="text-lg font-medium text-foreground mb-3">Description</h3>
                    
                    {isEditingDescription ? (
                      <div className="space-y-3">
                        <RichTextEditor
                          value={editedDescription}
                          onChange={setEditedDescription}
                          placeholder="Describe the task..."
                          className="min-h-[200px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={saveDescription}
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelDescription}
                            size="sm"
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
                        className="min-h-[100px] p-4 rounded-md border border-input bg-background hover:bg-accent/30 cursor-text transition-colors"
                      >
                        {formData.description ? (
                          <SafeHtml html={formData.description} />
                        ) : (
                          <p className="text-muted-foreground">Click to add a description...</p>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Attachments */}
                  <section>
                    <h3 className="text-lg font-medium text-foreground mb-3">Attachments</h3>
                    <FileUpload
                      onFileUpload={handleFileUpload}
                      disabled={isUploading}
                      className="mb-4"
                    />
                    {Array.isArray(formData.attachments) && formData.attachments.length > 0 && (
                      <div className="space-y-2">
                        {formData.attachments.map((attachment: any) => (
                          <div key={attachment.id} className="flex items-center justify-between p-2 bg-accent/50 rounded">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{attachment.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileRemove(attachment.id)}
                              className="h-8 w-8 p-0 hover:bg-destructive/20"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Time Tracking */}
                  {task?.id && (
                    <section>
                      <h3 className="text-lg font-medium text-foreground mb-3">Time Tracking</h3>
                      <div className="space-y-4">
                        <TimeTracker taskId={task.id} taskTitle={formData.title} />
                        <TimeEntriesList taskId={task.id} />
                      </div>
                    </section>
                  )}

                  {/* Comments */}
                  {task?.id && (
                    <section>
                      <h3 className="text-lg font-medium text-foreground mb-3">Comments</h3>
                      <CommentsSystemWithMentions
                        entityType="task"
                        entityId={task.id}
                        projectId={projectId}
                        onCountChange={setCommentCount}
                      />
                    </section>
                  )}
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                  {/* Task Info */}
                  <section className="bg-muted/30 rounded-lg p-4 space-y-4">
                    <h3 className="font-medium text-foreground">Task Info</h3>
                    
                    <InfoRow label="Status">
                      <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="in_review">In Review</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </InfoRow>

                    <InfoRow label="Priority">
                      <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as "low" | "medium" | "high" | "urgent" }))}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </InfoRow>

                    <InfoRow label="Due Date">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn("w-32 justify-start text-left font-normal", !formData.dueDate && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dueDate ? format(formData.dueDate, "MMM dd") : "Set date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={formData.dueDate}
                            onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </InfoRow>
                  </section>

                  {/* Assignees */}
                  <section className="bg-muted/30 rounded-lg p-4 space-y-4">
                    <h3 className="font-medium text-foreground">Assignees</h3>
                    <AssigneeCompanySelect
                      value={currentAssignees.map(a => a.id)}
                      onChange={(ids) => {}} // Not used, using onSelectOne instead
                      onSelectOne={handleAddAssignee}
                      suggestProjectId={projectId}
                    />
                    {currentAssignees.length > 0 && (
                      <div className="space-y-2">
                        {currentAssignees.map((assignee) => (
                          <div key={assignee.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={assignee.avatar || ""} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{assignee.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-destructive/20"
                              onClick={() => removeAssignee(assignee.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - Fixed */}
        <div className="px-4 md:px-6 py-3 border-t border-border bg-muted/30 shrink-0">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useProjectMembers } from "@/hooks/useProjectMembers";

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
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}

export function TaskDialog({ task, isOpen, onClose, onSave, columnId, projectId }: TaskDialogProps) {
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

  const { members: projectMembers, loading: membersLoading } = useProjectMembers(projectId);
  const [newTag, setNewTag] = useState("");
  const [commentCount, setCommentCount] = useState(0);
  const [showRelationships, setShowRelationships] = useState(false);
  const { uploadFile, deleteFile, isUploading } = useFileUpload();
  const { toast } = useToast();
  const { user } = useAuth();
  const { relationships } = useTaskRelationships(task?.id);
  const { assignees: currentAssignees, addAssignee, removeAssignee, fetchAssignees, loading: assigneesLoading } = useTaskAssignees(task?.id);

  const [savingAssignee, setSavingAssignee] = useState<string | null>(null);
  const [savingStoryPoints, setSavingStoryPoints] = useState(false);

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden bg-card border border-border p-0">
        <DialogTitle className="sr-only">
          {task ? `Edit Task: ${formData.title}` : 'Create New Task'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {task ? 'Edit task details, assignees, and manage comments' : 'Create a new task with details and assignees'}
        </DialogDescription>
        {/* Header with title editing and status button */}
        <div className="flex justify-between items-start px-6 py-4 border-b border-border bg-muted/30">
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
                  className="text-xl font-semibold bg-background border-input"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={saveTitle}
                  className="p-1 h-auto text-primary"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelTitle}
                  className="p-1 h-auto text-muted-foreground"
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
                className="text-xl font-semibold text-foreground hover:bg-accent/50 rounded px-2 py-1 -mx-2 cursor-text"
              >
                {formData.title || "Untitled Task"}
              </h1>
            )}
          </div>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Left Column - Main Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
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
                  className="min-h-[100px] p-4 bg-muted/30 border border-dashed border-input rounded-md cursor-text hover:bg-muted/50 hover:border-primary/50 transition-colors"
                >
                  {formData.description ? (
                    <SafeHtml 
                      html={formData.description}
                      className="prose prose-sm max-w-none"
                      allowedTags={['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3']}
                    />
                  ) : (
                    <p className="text-muted-foreground italic">Click to add a description...</p>
                  )}
                </div>
              )}
            </section>

            {/* Task Type */}
            <section>
              <SmartTaskTypeSelector
                value={formData.smartTaskType}
                onChange={(value) => setFormData(prev => ({ ...prev, smartTaskType: value }))}
                label="What type of work is this?"
                placeholder="Choose the type of work..."
              />
            </section>

            {/* File Attachments */}
            <section>
              <h3 className="text-lg font-medium text-foreground mb-3">Attachments</h3>
              <div className="space-y-4">
                <FileUpload 
                  onFileUpload={handleFileUpload}
                  disabled={isUploading}
                  accept="*/*"
                  maxSizeMB={10}
                />
                
                {Array.isArray(formData.attachments) && formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    {formData.attachments.map((attachment: any) => (
                      <UploadedFile
                        key={attachment.id}
                        fileName={attachment.name}
                        fileSize={attachment.size}
                        onRemove={() => handleFileRemove(attachment.id)}
                        onDownload={() => window.open(attachment.url, '_blank')}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Comments */}
            {task?.id && (
              <section>
                <h3 className="text-lg font-medium text-foreground mb-3">Comments</h3>
                <CommentsSystemWithMentions 
                  taskId={task.id} 
                  projectId={projectId}
                />
              </section>
            )}
          </div>

          {/* Right Column - Metadata */}
          <div className="w-80 p-6 border-l border-border bg-muted/20 overflow-y-auto space-y-6">
            {/* Status */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger 
                  className={`w-full border-2 transition-all duration-200 font-medium ${
                    formData.status === 'todo' 
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                      : formData.status === 'in_progress'
                      ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                      : formData.status === 'in_review'
                      ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300'
                      : formData.status === 'done'
                      ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300'
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm" 
                      style={{ backgroundColor: getStatusColor(formData.status) }}
                    />
                    <SelectValue className="font-medium" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-sm border-border shadow-xl z-50">
                  <SelectItem value="todo" className="hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <span className="font-medium">To Do</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in_progress" className="hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="font-medium">In Progress</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in_review" className="hover:bg-yellow-50 dark:hover:bg-yellow-950/30 transition-colors">
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="font-medium">In Review</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="done" className="hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors">
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="font-medium">Done</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignees */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Assignee {savingAssignee && <span className="ml-2 text-xs text-muted-foreground">Saving...</span>}</h4>
              <div className="space-y-3">
                {formData.assignees.length > 0 && (
                  <div className="space-y-2">
                    {formData.assignees.map((assignee) => (
                      <div key={assignee.id} className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={assignee.avatar} />
                          <AvatarFallback className="text-xs">
                            {assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-foreground flex-1">{assignee.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!!savingAssignee}
                          onClick={async () => {
                            if (!task?.id) return;
                            try {
                              setSavingAssignee(assignee.id);
                              await removeAssignee(assignee.id);
                              await fetchAssignees();
                            } finally {
                              setSavingAssignee(null);
                            }
                          }}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Select
                  value=""
                  onValueChange={async (value) => {
                    if (!task?.id) return;
                    const member = projectMembers.find(m => m.user_id === value);
                    if (!member) return;
                    try {
                      setSavingAssignee(value);
                      await addAssignee(value);
                      await fetchAssignees();
                    } finally {
                      setSavingAssignee(null);
                    }
                  }}
                >
                  <SelectTrigger className="bg-background border-input text-sm">
                    <SelectValue placeholder="Add assignee..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    {projectMembers
                      .filter(member => !formData.assignees.find(a => a.id === member.user_id))
                      .map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.full_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Story Points */}
            <InfoRow label="Story Points">
              <Select
                value={formData.story_points?.toString() || "none"}
                onValueChange={async (value) => {
                  const newValue = value === "none" ? null : parseInt(value);
                  const prev = formData.story_points;
                  setFormData(prevState => ({ ...prevState, story_points: newValue }));
                  if (task?.id) {
                    try {
                      setSavingStoryPoints(true);
                      const { error } = await supabase
                        .from('tasks')
                        .update({ story_points: newValue })
                        .eq('id', task.id);
                      if (error) throw error;
                      toast({ title: 'Saved', description: 'Story points updated' });
                    } catch (err: any) {
                      setFormData(prevState => ({ ...prevState, story_points: prev }));
                      toast({ title: 'Error', description: 'Failed to update story points', variant: 'destructive' });
                    } finally {
                      setSavingStoryPoints(false);
                    }
                  }
                }}
              >
                <SelectTrigger className="w-20 h-8 text-sm bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="none">-</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="13">13</SelectItem>
                  <SelectItem value="21">21</SelectItem>
                </SelectContent>
              </Select>
            </InfoRow>

            {/* Priority */}
            <InfoRow label="Priority">
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  priority: value as Task["priority"] 
                }))}
              >
                <SelectTrigger className="w-24 h-8 text-sm bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </InfoRow>

            {/* Due Date */}
            <InfoRow label="Due Date">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 text-sm font-normal bg-background border-input",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {formData.dueDate ? format(formData.dueDate, "MMM dd") : "Set date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                    initialFocus
                    className="bg-background pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </InfoRow>

            {/* Labels */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Labels</h4>
              <div className="space-y-2">
                <div className="flex gap-1">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add label..."
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                    className="flex-1 h-8 text-sm bg-background border-input"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addTag} 
                    className="h-8 px-2 text-sm bg-background border-input"
                  >
                    Add
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Time Tracking */}
            {task?.id && (
              <section>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Time Tracking</h4>
                <div className="space-y-3">
                  <TimeTracker taskId={task.id} taskTitle={task.title} />
                  <TimeEntriesList taskId={task.id} />
                </div>
              </section>
            )}

            {/* Relationships */}
            {task?.id && projectId && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Relationships</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRelationships(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <GitBranch className="w-3 h-3 mr-1" />
                    Manage
                  </Button>
                </div>
                
                {relationships.length > 0 ? (
                  <TaskRelationshipIndicator
                    relationships={relationships}
                    taskId={task.id}
                    compact
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No relationships defined
                  </p>
                )}
              </section>
            )}

            {/* Task Stats */}
            {task && (
              <div className="flex flex-col gap-2 text-xs text-muted-foreground border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Comments
                  </span>
                  <span>{commentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    Attachments
                  </span>
                  <span>{Array.isArray(formData.attachments) ? formData.attachments.length : 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    Relationships
                  </span>
                  <span>{relationships.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.title.trim()}>
            {task ? "Update Task" : "Create Task"}
          </Button>
        </div>
      </DialogContent>

      {/* Task Relationships Dialog */}
      {task?.id && projectId && (
        <TaskRelationshipsDialog
          isOpen={showRelationships}
          onClose={() => setShowRelationships(false)}
          taskId={task.id}
          taskTitle={task.title}
          projectId={projectId}
        />
      )}
    </Dialog>
  );
}


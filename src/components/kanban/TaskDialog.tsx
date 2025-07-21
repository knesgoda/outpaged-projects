import { useState, useEffect } from "react";
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
import { Task } from "./TaskCard";
import { CalendarIcon, X, User, Tag, MessageSquare, Paperclip, GitBranch } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useToast } from "@/hooks/use-toast";
import { TimeTracker } from "@/components/time-tracking/TimeTracker";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";
import { CommentsSystem } from "@/components/comments/CommentsSystem";
import { TaskRelationshipsDialog } from "@/components/tasks/TaskRelationshipsDialog";
import { TaskRelationshipIndicator } from "@/components/tasks/TaskRelationshipIndicator";
import { useTaskRelationships } from "@/hooks/useTaskRelationships";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTaskAssignees } from "@/hooks/useTaskAssignees";

interface TaskDialogProps {
  task?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  columnId?: string;
  projectId?: string;
}

export function TaskDialog({ task, isOpen, onClose, onSave, columnId, projectId }: TaskDialogProps) {
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
  });

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [commentCount, setCommentCount] = useState(0);
  const [showRelationships, setShowRelationships] = useState(false);
  const { uploadFile, deleteFile, isUploading } = useFileUpload();
  const { toast } = useToast();
  const { user } = useAuth();
  const { relationships } = useTaskRelationships(task?.id);
  const { assignees: currentAssignees, updateAssignees } = useTaskAssignees(task?.id);

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
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
        });
      }
    }
  }, [isOpen, task]);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .limit(20);

      if (error) throw error;

      const members = data?.map(profile => ({
        id: profile.user_id,
        name: profile.full_name || 'Unknown User',
        initials: (profile.full_name || 'U')
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        avatar: profile.avatar_url
      })) || [];

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

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

    const taskData: Partial<Task> & { assignee_id?: string; due_date?: string; hierarchy_level?: string; task_type?: string; parent_id?: string } = {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? "Edit Task" : "Create New Task"}
          </DialogTitle>
          <DialogDescription>
            {task ? "Update task details and settings" : "Add a new task to your project"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Task Details */}
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title..."
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the task..."
                rows={4}
              />
            </div>

            {/* Smart Task Type Selector */}
            <SmartTaskTypeSelector
              value={formData.smartTaskType}
              onChange={(value) => setFormData(prev => ({ ...prev, smartTaskType: value }))}
              label="What type of work is this?"
              placeholder="Choose the type of work..."
            />

            {/* Priority, Status and Assignee Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    priority: value as Task["priority"] 
                  }))}
                >
                  <SelectTrigger>
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

              {/* Status Selection for editing tasks */}
              {task && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={task.status}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      status: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Assignee Row */}
            <div className="grid grid-cols-1 gap-4">

              <div className="space-y-2">
                <Label>Assignees</Label>
                <div className="space-y-2">
                  {formData.assignees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.assignees.map((assignee) => (
                        <Badge key={assignee.id} variant="secondary" className="flex items-center gap-2">
                          <Avatar className="w-4 h-4">
                            <AvatarImage src={assignee.avatar} />
                            <AvatarFallback className="text-xs">
                              {assignee.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span>{assignee.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                assignees: prev.assignees.filter(a => a.id !== assignee.id)
                              }));
                            }}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value !== "unassigned") {
                        const member = teamMembers.find(m => m.id === value);
                        if (member && !formData.assignees.find(a => a.id === member.id)) {
                          setFormData(prev => ({ 
                            ...prev, 
                            assignees: [...prev.assignees, {
                              id: member.id,
                              name: member.name,
                              initials: member.initials,
                              avatar: member.avatar
                            }]
                          }));
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add assignee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers
                        .filter(member => !formData.assignees.find(a => a.id === member.id))
                        .map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-xs">
                                {member.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
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

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === "Enter" && addTag()}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* File Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
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
            </div>
          </div>

          {/* Right Column - Comments, Time Tracking, etc. */}
          <div className="space-y-6">
            {/* Time Tracking */}
            {task?.id && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Time Tracking</h3>
                <div className="grid grid-cols-1 gap-4">
                  <TimeTracker taskId={task.id} taskTitle={task.title} />
                  <TimeEntriesList taskId={task.id} />
                </div>
              </div>
            )}

            {/* Task Relationships */}
            {task?.id && projectId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Relationships</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRelationships(true)}
                  >
                    <GitBranch className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </div>
                
                {relationships.length > 0 ? (
                  <TaskRelationshipIndicator
                    relationships={relationships}
                    taskId={task.id}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No relationships defined for this task.
                  </p>
                )}
              </div>
            )}

            {/* Comments */}
            {task?.id && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Comments</h3>
                <CommentsSystem 
                  taskId={task.id} 
                  onCommentCountChange={setCommentCount}
                />
              </div>
            )}

            {/* Task Stats (if editing) */}
            {task && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  {commentCount} comments
                </div>
                <div className="flex items-center gap-1">
                  <Paperclip className="w-4 h-4" />
                  {Array.isArray(formData.attachments) ? formData.attachments.length : 0} attachments
                </div>
                <div className="flex items-center gap-1">
                  <GitBranch className="w-4 h-4" />
                  {relationships.length} relationships
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
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

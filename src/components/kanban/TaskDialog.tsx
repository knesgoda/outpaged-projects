import { useState } from "react";
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
import { Task } from "./TaskCard";
import { CalendarIcon, X, User, Tag, MessageSquare, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useToast } from "@/hooks/use-toast";
import { TimeTracker } from "@/components/time-tracking/TimeTracker";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";

interface TaskDialogProps {
  task?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  columnId?: string;
}

const mockTeamMembers = [
  { id: 1, name: "Alice Johnson", initials: "AJ", avatar: null },
  { id: 2, name: "Bob Smith", initials: "BS", avatar: null },
  { id: 3, name: "Carol Davis", initials: "CD", avatar: null },
];
const mockTags = ["Frontend", "Backend", "Bug", "Feature", "Urgent", "Review"];

export function TaskDialog({ task, isOpen, onClose, onSave, columnId }: TaskDialogProps) {
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    priority: task?.priority || "medium",
    assignee: task?.assignee || null,
    dueDate: task?.dueDate ? new Date(task.dueDate) : undefined,
    tags: task?.tags || [],
    attachments: task?.attachments || [],
  });

  const [newTag, setNewTag] = useState("");
  const { uploadFile, deleteFile, isUploading } = useFileUpload();
  const { toast } = useToast();

  const handleSave = () => {
    const taskData: Partial<Task> = {
      ...formData,
      id: task?.id || `task-${Date.now()}`,
      status: columnId || task?.status || "todo",
      dueDate: formData.dueDate ? format(formData.dueDate, "MMM dd") : undefined,
      comments: task?.comments || 0,
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? "Edit Task" : "Create New Task"}
          </DialogTitle>
          <DialogDescription>
            {task ? "Update task details and settings" : "Add a new task to your project"}
          </DialogDescription>
        </DialogHeader>

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
              rows={3}
            />
          </div>

          {/* Priority and Assignee Row */}
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

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={formData.assignee?.name || "unassigned"}
                onValueChange={(value) => {
                  if (value === "unassigned") {
                    setFormData(prev => ({ ...prev, assignee: null }));
                  } else {
                    const member = mockTeamMembers.find(m => m.name === value);
                    setFormData(prev => ({ 
                      ...prev, 
                      assignee: member ? {
                        name: member.name,
                        initials: member.initials,
                        avatar: member.avatar
                      } : null
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee">
                    {formData.assignee && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={formData.assignee.avatar} />
                          <AvatarFallback className="text-xs">
                            {formData.assignee.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span>{formData.assignee.name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {mockTeamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.name}>
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
              <div className="flex flex-wrap gap-2">
                {mockTags.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    variant={formData.tags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (formData.tags.includes(tag)) {
                        removeTag(tag);
                      } else {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                      }
                    }}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Button>
                ))}
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

          {/* Time Tracking */}
          {task?.id && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TimeTracker taskId={task.id} taskTitle={task.title} />
                <TimeEntriesList taskId={task.id} />
              </div>
            </div>
          )}

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

          {/* Task Stats (if editing) */}
          {task && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {task.comments} comments
              </div>
              <div className="flex items-center gap-1">
                <Paperclip className="w-4 h-4" />
                {task.attachments} attachments
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.title.trim()}>
              {task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
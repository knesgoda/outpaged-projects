
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SmartTaskTypeSelector, SMART_TASK_TYPE_OPTIONS } from "@/components/tasks/SmartTaskTypeSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Task } from "./TaskCard";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Tag, 
  FileText, 
  AlertTriangle,
  X,
  Plus,
  Upload
} from "lucide-react";
import { format } from "date-fns";

interface EnhancedTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projectId: string;
  columnId?: string;
  swimlaneId?: string;
  onTaskSaved: () => void;
  availableAssignees?: Array<{ id: string; name: string; avatar?: string }>;
  availableTags?: string[];
}

export function EnhancedTaskDialog({ 
  open, 
  onOpenChange, 
  task, 
  projectId, 
  columnId,
  swimlaneId,
  onTaskSaved,
  availableAssignees = [],
  availableTags = []
}: EnhancedTaskDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    smartTaskType: "task",
    story_points: 1,
    due_date: null as Date | null,
    blocked: false,
    blocking_reason: "",
    tags: [] as string[],
    assignees: [] as string[],
    parent_id: null as string | null
  });
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        status: task.status,
        smartTaskType: task.task_type,
        story_points: task.story_points || 1,
        due_date: task.dueDate ? new Date(task.dueDate) : null,
        blocked: task.blocked || false,
        blocking_reason: task.blocking_reason || "",
        tags: task.tags || [],
        assignees: task.assignees?.map(a => a.id) || [],
        parent_id: task.parent_id || null
      });
    } else {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        smartTaskType: "task",
        story_points: 1,
        due_date: null,
        blocked: false,
        blocking_reason: "",
        tags: [],
        assignees: [],
        parent_id: null
      });
    }
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const selectedOption = SMART_TASK_TYPE_OPTIONS.find(option => option.id === formData.smartTaskType);
      if (!selectedOption) {
        throw new Error("Invalid task type selected");
      }

      const taskData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        status: formData.status as 'todo' | 'in_progress' | 'in_review' | 'done',
        hierarchy_level: selectedOption.hierarchy_level,
        task_type: selectedOption.task_type,
        project_id: projectId,
        story_points: formData.story_points,
        due_date: formData.due_date?.toISOString(),
        blocked: formData.blocked,
        blocking_reason: formData.blocked ? formData.blocking_reason : null,
        parent_id: formData.parent_id,
        swimlane_id: swimlaneId || null,
        reporter_id: user.id
      };

      if (task) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id);

        if (error) throw error;

        // Update assignees
        await supabase.from('task_assignees').delete().eq('task_id', task.id);
        if (formData.assignees.length > 0) {
          const assigneeInserts = formData.assignees.map(assigneeId => ({
            task_id: task.id,
            user_id: assigneeId,
            assigned_by: user.id
          }));
          await supabase.from('task_assignees').insert(assigneeInserts);
        }

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        // Create new task
        const { data: newTask, error } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (error) throw error;

        // Add assignees
        if (formData.assignees.length > 0 && newTask) {
          const assigneeInserts = formData.assignees.map(assigneeId => ({
            task_id: newTask.id,
            user_id: assigneeId,
            assigned_by: user.id
          }));
          await supabase.from('task_assignees').insert(assigneeInserts);
        }

        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      onTaskSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
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

  const toggleAssignee = (assigneeId: string) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(assigneeId)
        ? prev.assignees.filter(id => id !== assigneeId)
        : [...prev.assignees, assigneeId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="assignment">Assignment</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
            <TabsTrigger value="attachments">Files</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6">
            <TabsContent value="details" className="space-y-4">
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
                  rows={4}
                />
              </div>

              <SmartTaskTypeSelector
                value={formData.smartTaskType}
                onChange={(value) => setFormData(prev => ({ ...prev, smartTaskType: value }))}
                label="What type of work is this?"
                placeholder="Choose the type of work..."
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
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
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Todo</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Blocking Section */}
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="blocked"
                    checked={formData.blocked}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, blocked: checked }))}
                  />
                  <Label htmlFor="blocked" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Task is blocked
                  </Label>
                </div>
                {formData.blocked && (
                  <div className="space-y-2">
                    <Label htmlFor="blocking_reason">Blocking Reason</Label>
                    <Textarea
                      id="blocking_reason"
                      value={formData.blocking_reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, blocking_reason: e.target.value }))}
                      placeholder="Explain why this task is blocked..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="assignment" className="space-y-4">
              {/* Assignees */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Assignees
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {availableAssignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className={`flex items-center space-x-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.assignees.includes(assignee.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted'
                      }`}
                      onClick={() => toggleAssignee(assignee.id)}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {assignee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{assignee.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" size="sm" onClick={addTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="planning" className="space-y-4">
              {/* Story Points */}
              <div className="space-y-3">
                <Label>Story Points: {formData.story_points}</Label>
                <Slider
                  value={[formData.story_points]}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, story_points: value[0] }))}
                  max={21}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span>5</span>
                  <span>10</span>
                  <span>21</span>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Due Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !formData.due_date && "text-muted-foreground"
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date ? format(formData.due_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.due_date || undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date || null }))}
                      initialFocus
                    />
                    {formData.due_date && (
                      <div className="p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, due_date: null }))}
                        >
                          Clear Date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Upload Attachments</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop files here, or click to browse
                </p>
                <Button variant="outline">Choose Files</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, Images (JPG, PNG, GIF)
              </p>
            </TabsContent>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !formData.title.trim()}>
                {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

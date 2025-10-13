// @ts-nocheck
import { useState, useEffect } from "react";
import { X, Plus, Paperclip, Link as LinkIcon, User, Calendar, Clock, Tag } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface CustomField {
  id: string;
  name: string;
  fieldType: string;
  isRequired: boolean;
  options?: any[];
}

interface EnhancedTaskCreatorProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated?: (taskId: string) => void;
}

export function EnhancedTaskCreator({ projectId, open, onClose, onCreated }: EnhancedTaskCreatorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<'task' | 'story' | 'bug' | 'subtask'>('task');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [storyPoints, setStoryPoints] = useState<number | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [linkedIssues, setLinkedIssues] = useState<any[]>([]);
  const [watchers, setWatchers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      loadCustomFields();
      loadTeamMembers();
    }
  }, [open, projectId]);

  const loadCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('project_id', projectId)
        .eq('applies_to', ['task']);

      if (error) throw error;
      setCustomFields(data?.map((f: any) => ({
        id: f.id,
        name: f.name,
        fieldType: f.field_type,
        isRequired: f.is_required,
        options: f.options,
      })) || []);
    } catch (error) {
      console.error("Failed to load custom fields:", error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('user_id, profiles(*)')
        .eq('project_id', projectId);

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error("Failed to load team members:", error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title,
          description,
          task_type: taskType,
          priority,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
          story_points: storyPoints,
          reporter_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Save custom field values
      for (const [fieldId, value] of Object.entries(customFieldValues)) {
        if (value !== undefined && value !== null && value !== "") {
          await supabase.from('custom_field_values').insert({
            field_id: fieldId,
            item_id: task.id,
            value: { value },
          });
        }
      }

      toast({ title: "Success", description: `Task ${task.ticket_number || task.id} created` });
      onCreated?.(task.id);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTaskType('task');
    setPriority('medium');
    setAssigneeId("");
    setDueDate("");
    setStoryPoints(null);
    setLabels([]);
    setCustomFieldValues({});
    setAttachments([]);
    setLinkedIssues([]);
    setWatchers([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-x-4 top-4 bottom-4 md:inset-x-auto md:left-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2 bg-background rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Create {taskType}</h2>
            <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
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
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Body */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details, @mention people, attach files..."
                rows={4}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Priority */}
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
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

              {/* Assignee */}
              <div>
                <Label>Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles?.full_name || member.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {/* Story Points */}
              {(taskType === 'story' || taskType === 'task') && (
                <div>
                  <Label>Story Points</Label>
                  <Input
                    type="number"
                    value={storyPoints ?? ""}
                    onChange={(e) => setStoryPoints(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Custom Fields</Label>
                  <Button variant="ghost" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                </div>
                {customFields.map((field) => (
                  <div key={field.id}>
                    <Label>
                      {field.name}
                      {field.isRequired && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.fieldType === 'text' && (
                      <Input
                        value={customFieldValues[field.id] || ""}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                      />
                    )}
                    {field.fieldType === 'select' && (
                      <Select
                        value={customFieldValues[field.id]}
                        onValueChange={(v) => setCustomFieldValues({ ...customFieldValues, [field.id]: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt: any) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Advanced Fields Toggle */}
            <Button variant="ghost" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? "Hide" : "Show"} Advanced Fields
            </Button>

            {showAdvanced && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                <div>
                  <Label>Labels / Tags</Label>
                  <Input placeholder="Add labels (comma-separated)" />
                </div>
                <div>
                  <Label>Linked Issues</Label>
                  <Button variant="outline" size="sm" className="w-full">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Add Link
                  </Button>
                </div>
                <div>
                  <Label>Watchers</Label>
                  <Button variant="outline" size="sm" className="w-full">
                    <User className="mr-2 h-4 w-4" />
                    Add Watcher
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

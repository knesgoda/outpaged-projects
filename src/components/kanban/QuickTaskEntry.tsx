
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Zap, AlertCircle } from "lucide-react";

interface QuickTaskEntryProps {
  projectId: string;
  columnId: string;
  swimlaneId?: string;
  onTaskCreated: () => void;
  onCancel: () => void;
}

export function QuickTaskEntry({ 
  projectId, 
  columnId, 
  swimlaneId, 
  onTaskCreated, 
  onCancel 
}: QuickTaskEntryProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [taskType, setTaskType] = useState("task");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: title.trim(),
          priority: priority as 'low' | 'medium' | 'high' | 'urgent',
          status: 'todo',
          hierarchy_level: taskType === 'story' ? 'story' : 'task',
          task_type: taskType as any,
          project_id: projectId,
          reporter_id: user.id,
          swimlane_id: swimlaneId || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      setTitle("");
      onTaskCreated();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/20 text-warning",
    high: "bg-destructive/20 text-destructive",
    urgent: "bg-destructive text-destructive-foreground",
  };

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Quick Add</span>
          </div>
          
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title and press Enter..."
            autoFocus
            className="border-primary/30"
          />
          
          <div className="flex items-center gap-2">
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="story">Story</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature_request">Feature</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            
            <Badge className={priorityColors[priority as keyof typeof priorityColors]} variant="secondary">
              <AlertCircle className="w-3 h-3 mr-1" />
              {priority}
            </Badge>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading || !title.trim()}>
              {loading ? "Creating..." : "Add Task"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

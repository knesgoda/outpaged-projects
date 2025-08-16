import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  // Note: start_date and due_date will be available after migration
}

interface GanttChartProps {
  projectId: string;
}

export const GanttChart = ({ projectId }: GanttChartProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks for Gantt chart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-200";
      case "in_progress":
        return "bg-blue-200";
      case "in_review":
        return "bg-yellow-200";
      case "done":
        return "bg-green-200";
      default:
        return "bg-gray-200";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Project Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Gantt chart view will be enhanced after adding date fields to tasks
          </p>
        </div>
        <Button variant="outline" size="sm">
          <CalendarDays className="h-4 w-4 mr-2" />
          View Options
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h4 className="text-lg font-medium mb-2">No Tasks Found</h4>
          <p className="text-muted-foreground">
            Create some tasks to see them in the Gantt chart
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{task.title}</h4>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStatusColor(task.status)}`}
                  >
                    {task.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created: {new Date(task.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Priority: {task.priority}
                  </div>
                </div>
              </div>
              
              {/* Timeline bar - placeholder for now */}
              <div className="flex-1 ml-4">
                <div className="h-6 bg-muted rounded-sm relative">
                  <div
                    className={`h-full rounded-sm ${getStatusColor(task.status)} opacity-60`}
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>
            Full Gantt chart functionality with start/end dates will be available after the database migration.
          </span>
        </div>
      </div>
    </Card>
  );
};
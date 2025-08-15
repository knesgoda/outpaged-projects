import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  start_date: string | null;
  due_date: string | null;
  status: string;
  estimated_hours: number | null;
  assignee_name?: string;
}

interface GanttChartProps {
  projectId: string;
}

export const GanttChart = ({ projectId }: GanttChartProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          start_date,
          due_date,
          status,
          estimated_hours,
          task_assignees_with_profiles(full_name)
        `)
        .eq("project_id", projectId)
        .not("start_date", "is", null)
        .not("due_date", "is", null)
        .order("start_date");

      if (error) throw error;

      const tasksWithAssignees = data.map((task: any) => ({
        ...task,
        assignee_name: task.task_assignees_with_profiles?.[0]?.full_name,
      }));

      setTasks(tasksWithAssignees);
      
      // Calculate date range
      if (data.length > 0) {
        const dates = data.flatMap(task => [
          new Date(task.start_date),
          new Date(task.due_date)
        ]);
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        
        // Add some padding
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 7);
        
        setDateRange({ start: minDate, end: maxDate });
      }
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

  const getDaysBetween = (start: Date, end: Date) => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getTaskPosition = (taskStart: string, taskEnd: string) => {
    if (!dateRange) return { left: 0, width: 0 };
    
    const start = new Date(taskStart);
    const end = new Date(taskEnd);
    const totalDays = getDaysBetween(dateRange.start, dateRange.end);
    const startOffset = getDaysBetween(dateRange.start, start);
    const duration = getDaysBetween(start, end);
    
    return {
      left: (startOffset / totalDays) * 100,
      width: (duration / totalDays) * 100,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-400";
      case "in_progress":
        return "bg-blue-500";
      case "in_review":
        return "bg-yellow-500";
      case "done":
        return "bg-green-500";
      default:
        return "bg-gray-400";
    }
  };

  const generateTimelineHeader = () => {
    if (!dateRange) return [];
    
    const days = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Scheduled Tasks</h3>
          <p>Add start and due dates to your tasks to see them in the Gantt chart.</p>
        </div>
      </Card>
    );
  }

  const timelineHeader = generateTimelineHeader();

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Project Timeline
        </h3>
        <p className="text-sm text-muted-foreground">
          Visual timeline showing task dependencies and progress
        </p>
      </div>

      <div className="overflow-x-auto">
        {/* Timeline Header */}
        <div className="min-w-[800px]">
          <div className="flex border-b border-border mb-4">
            <div className="w-80 p-2 font-medium">Task</div>
            <div className="flex-1 relative">
              <div className="flex">
                {timelineHeader.map((date, index) => (
                  <div
                    key={index}
                    className="flex-1 text-xs text-center p-1 border-l border-border"
                  >
                    {date.getDate()}/{date.getMonth() + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task Rows */}
          <div className="space-y-2">
            {tasks.map((task) => {
              const position = getTaskPosition(task.start_date!, task.due_date!);
              return (
                <div key={task.id} className="flex items-center min-h-[40px]">
                  {/* Task Info */}
                  <div className="w-80 p-2 space-y-1">
                    <div className="font-medium text-sm truncate">{task.title}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {task.status.replace("_", " ")}
                      </Badge>
                      {task.assignee_name && (
                        <span className="text-xs text-muted-foreground">
                          {task.assignee_name}
                        </span>
                      )}
                      {task.estimated_hours && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.estimated_hours}h
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="flex-1 relative h-8">
                    <div
                      className={`absolute h-6 rounded ${getStatusColor(task.status)} opacity-80`}
                      style={{
                        left: `${position.left}%`,
                        width: `${Math.max(position.width, 2)}%`,
                        top: "4px",
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {dateRange && (
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Timeline: {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
        </div>
      )}
    </Card>
  );
};
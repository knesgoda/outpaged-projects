import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ArrowRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  status: string;
  priority?: string;
  assignee_name?: string;
  dependencies?: string[];
}

interface GanttViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function GanttView({ tasks, onTaskClick }: GanttViewProps) {
  // Filter tasks with dates
  const tasksWithDates = tasks.filter(t => t.start_date && t.end_date);

  if (tasksWithDates.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No tasks with start and end dates found. Add dates to tasks to see them in the Gantt view.
        </CardContent>
      </Card>
    );
  }

  // Calculate date range
  const allDates = tasksWithDates.flatMap(t => [
    new Date(t.start_date!),
    new Date(t.end_date!)
  ]);
  const minDate = startOfMonth(new Date(Math.min(...allDates.map(d => d.getTime()))));
  const maxDate = endOfMonth(new Date(Math.max(...allDates.map(d => d.getTime()))));
  const totalDays = differenceInDays(maxDate, minDate);
  const days = eachDayOfInterval({ start: minDate, end: maxDate });

  // Group by weeks for header
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getBarPosition = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysFromStart = differenceInDays(start, minDate);
    const duration = differenceInDays(end, start);
    
    return {
      left: `${(daysFromStart / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'in_review':
        return 'bg-purple-500';
      case 'todo':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gantt Timeline</CardTitle>
        <CardDescription>
          Visual timeline from {format(minDate, 'MMM d')} to {format(maxDate, 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Timeline header */}
          <div className="flex border-b">
            <div className="w-64 flex-shrink-0 p-2 font-semibold">Task</div>
            <div className="flex-1 flex">
              {weeks.map((week, idx) => (
                <div key={idx} className="flex-1 border-l px-2 py-1">
                  <div className="text-xs text-muted-foreground">
                    {format(week[0], 'MMM d')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            {tasksWithDates.map((task) => (
              <div key={task.id} className="flex items-center hover:bg-muted/50 rounded-lg transition-colors">
                <div className="w-64 flex-shrink-0 p-2">
                  <button
                    onClick={() => onTaskClick?.(task.id)}
                    className="text-left w-full"
                  >
                    <div className="font-medium text-sm truncate">{task.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {task.assignee_name && (
                        <span className="text-xs text-muted-foreground">{task.assignee_name}</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {task.status}
                      </Badge>
                    </div>
                  </button>
                </div>
                <div className="flex-1 relative h-12 px-2">
                  <div
                    className={`absolute top-2 h-8 rounded ${getStatusColor(task.status)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer flex items-center px-2`}
                    style={getBarPosition(task.start_date!, task.end_date!)}
                    onClick={() => onTaskClick?.(task.id)}
                  >
                    <span className="text-xs text-primary-foreground font-medium truncate">
                      {differenceInDays(new Date(task.end_date!), new Date(task.start_date!))}d
                    </span>
                  </div>
                  {/* Dependency arrows */}
                  {task.dependencies && task.dependencies.length > 0 && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <span className="text-sm font-medium">Status:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-400" />
              <span className="text-xs">To Do</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span className="text-xs">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500" />
              <span className="text-xs">In Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span className="text-xs">Done</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

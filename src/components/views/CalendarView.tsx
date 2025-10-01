import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";

interface Task {
  id: string;
  title: string;
  due_date?: string;
  status: string;
  priority?: string;
}

interface CalendarViewProps {
  tasks: Task[];
  milestones?: Array<{ date: string; title: string }>;
  onTaskClick?: (taskId: string) => void;
}

export function CalendarView({ tasks, milestones = [], onTaskClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    );
  };

  const getMilestonesForDay = (date: Date) => {
    return milestones.filter(milestone =>
      isSameDay(new Date(milestone.date), date)
    );
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>View tasks and milestones by date</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[150px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Header */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-muted p-2 text-center text-sm font-semibold">
              {day}
            </div>
          ))}

          {/* Days */}
          {days.map((day, idx) => {
            const dayTasks = getTasksForDay(day);
            const dayMilestones = getMilestonesForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={idx}
                className={`bg-background min-h-[120px] p-2 ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${isToday ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${isToday ? 'font-bold' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayMilestones.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      🎯 {dayMilestones.length}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  {dayMilestones.map((milestone, idx) => (
                    <div
                      key={`milestone-${idx}`}
                      className="text-xs p-1 bg-primary/10 rounded border border-primary/20 truncate"
                      title={milestone.title}
                    >
                      🎯 {milestone.title}
                    </div>
                  ))}

                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick?.(task.id)}
                      className="w-full text-left"
                    >
                      <div className="text-xs p-1 bg-muted rounded hover:bg-muted/80 transition-colors truncate">
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={getPriorityColor(task.priority)}
                            className="text-[10px] h-4 px-1"
                          >
                            {task.status}
                          </Badge>
                          <span className="truncate">{task.title}</span>
                        </div>
                      </div>
                    </button>
                  ))}

                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

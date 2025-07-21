
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Task } from "./TaskCard";
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface TaskMetricsProps {
  tasks: Task[];
  title?: string;
}

export function TaskMetrics({ tasks, title = "Task Metrics" }: TaskMetricsProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const blockedTasks = tasks.filter(task => task.blocked).length;
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  }).length;

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const blockedRate = totalTasks > 0 ? (blockedTasks / totalTasks) * 100 : 0;

  const priorityBreakdown = {
    urgent: tasks.filter(task => task.priority === 'urgent').length,
    high: tasks.filter(task => task.priority === 'high').length,
    medium: tasks.filter(task => task.priority === 'medium').length,
    low: tasks.filter(task => task.priority === 'low').length,
  };

  const totalStoryPoints = tasks.reduce((sum, task) => sum + (task.story_points || 0), 0);
  const completedStoryPoints = tasks
    .filter(task => task.status === 'done')
    .reduce((sum, task) => sum + (task.story_points || 0), 0);

  const velocityRate = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Completion Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completed</span>
              <span>{completedTasks}/{totalTasks}</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {completionRate > 75 ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : completionRate > 50 ? (
                <Minus className="w-3 h-3 text-warning" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              {completionRate.toFixed(1)}% complete
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Work */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">In Progress</span>
              <Badge variant="secondary">{inProgressTasks}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Overdue</span>
              <Badge variant={overdueTasks > 0 ? "destructive" : "secondary"}>
                {overdueTasks}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Blocked</span>
              <Badge variant={blockedTasks > 0 ? "destructive" : "secondary"}>
                {blockedTasks}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(priorityBreakdown).map(([priority, count]) => (
              <div key={priority} className="flex justify-between items-center">
                <span className="text-sm capitalize">{priority}</span>
                <Badge 
                  variant={
                    priority === 'urgent' ? 'destructive' :
                    priority === 'high' ? 'destructive' :
                    priority === 'medium' ? 'default' : 'secondary'
                  }
                  className="text-xs"
                >
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Story Points Velocity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Story Points</span>
              <span>{completedStoryPoints}/{totalStoryPoints}</span>
            </div>
            <Progress value={velocityRate} className="h-2" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {velocityRate > 75 ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : velocityRate > 50 ? (
                <Minus className="w-3 h-3 text-warning" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              {velocityRate.toFixed(1)}% velocity
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

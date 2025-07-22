import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  X
} from "lucide-react";
import { Task } from "@/components/kanban/TaskCard";

interface StatsPanelProps {
  tasks: Task[];
  children: React.ReactNode;
}

export function StatsPanel({ tasks, children }: StatsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress').length;
  const blockedTasks = tasks.filter(task => task.blocked).length;
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    return dueDate < today && task.status !== 'done';
  }).length;

  // Priority breakdown
  const urgentTasks = tasks.filter(task => task.priority === 'urgent').length;
  const highTasks = tasks.filter(task => task.priority === 'high').length;
  const mediumTasks = tasks.filter(task => task.priority === 'medium').length;
  const lowTasks = tasks.filter(task => task.priority === 'low').length;

  // Story points (velocity)
  const totalStoryPoints = tasks.reduce((sum, task) => sum + (task.story_points || 0), 0);
  const completedStoryPoints = tasks
    .filter(task => task.status === 'done')
    .reduce((sum, task) => sum + (task.story_points || 0), 0);

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const velocityPercentage = totalStoryPoints > 0 ? Math.round((completedStoryPoints / totalStoryPoints) * 100) : 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Project Statistics
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6 overflow-y-auto">
          {/* Completion Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Completed</div>
              <p className="text-xs text-muted-foreground">
                {completedTasks}/{totalTasks} tasks
              </p>
              <div className="w-full bg-secondary rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completionPercentage}% complete
              </p>
            </CardContent>
          </Card>

          {/* Active Work */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Active Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">In Progress</span>
                <Badge variant="outline">{inProgressTasks}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Overdue</span>
                <Badge variant="outline">{overdueTasks}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Blocked</span>
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  {blockedTasks}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Priority Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Urgent</span>
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  {urgentTasks}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">High</span>
                <Badge variant="outline" className="bg-red-100 text-red-800">
                  {highTasks}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Medium</span>
                <Badge variant="outline" className="bg-teal-100 text-teal-800">
                  {mediumTasks}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Low</span>
                <Badge variant="outline">{lowTasks}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Velocity (Story Points) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Story Points</div>
              <p className="text-xs text-muted-foreground">
                {completedStoryPoints}/{totalStoryPoints} points
              </p>
              <div className="w-full bg-secondary rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${velocityPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {velocityPercentage}% velocity
              </p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
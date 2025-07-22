import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  TrendingUp,
  Users,
  CalendarDays,
  Target
} from "lucide-react";

interface TaskStats {
  total: number;
  completed: number;
  in_progress: number;
  blocked: number;
  overdue: number;
}

interface ProjectStats {
  id: string;
  name: string;
  task_count: number;
  completed_tasks: number;
  blocked_tasks: number;
  team_size: number;
}

export function TaskManagementDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    in_progress: 0,
    blocked: 0,
    overdue: 0
  });
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user's projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', user?.id);

      if (projectsError) throw projectsError;

      const projectIds = projects?.map(p => p.id) || [];

      if (projectIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch task statistics
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, blocked, due_date, project_id')
        .in('project_id', projectIds);

      if (tasksError) throw tasksError;

      // Calculate task stats
      const stats = {
        total: tasks?.length || 0,
        completed: tasks?.filter(t => t.status === 'done').length || 0,
        in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
        blocked: tasks?.filter(t => t.blocked === true).length || 0,
        overdue: tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date()).length || 0
      };

      setTaskStats(stats);

      // Fetch project statistics with team members
      const projectStatsPromises = projects?.map(async (project) => {
        const [tasksResult, membersResult] = await Promise.all([
          supabase
            .from('tasks')
            .select('id, status, blocked')
            .eq('project_id', project.id),
          supabase
            .from('project_members')
            .select('user_id')
            .eq('project_id', project.id)
        ]);

        const projectTasks = tasksResult.data || [];
        const projectMembers = membersResult.data || [];

        return {
          id: project.id,
          name: project.name,
          task_count: projectTasks.length,
          completed_tasks: projectTasks.filter(t => t.status === 'done').length,
          blocked_tasks: projectTasks.filter(t => t.blocked === true).length,
          team_size: projectMembers.length + 1 // +1 for project owner
        };
      }) || [];

      const projectStatsData = await Promise.all(projectStatsPromises);
      setProjectStats(projectStatsData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;
  const blockedRate = taskStats.total > 0 ? Math.round((taskStats.blocked / taskStats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-1"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{taskStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{taskStats.in_progress}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{taskStats.blocked}</div>
            <p className="text-xs text-muted-foreground">
              {blockedRate}% of total tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">Project Overview</TabsTrigger>
          <TabsTrigger value="issues">Critical Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Project Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectStats.map((project) => {
                  const projectCompletionRate = project.task_count > 0 
                    ? Math.round((project.completed_tasks / project.task_count) * 100) 
                    : 0;
                  const blockedPercentage = project.task_count > 0 
                    ? Math.round((project.blocked_tasks / project.task_count) * 100) 
                    : 0;

                  return (
                    <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                      <div className="space-y-1">
                        <h4 className="font-medium">{project.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {project.task_count} tasks
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {project.team_size} members
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-success">
                          {projectCompletionRate}% done
                        </Badge>
                        {project.blocked_tasks > 0 && (
                          <Badge variant="destructive">
                            {project.blocked_tasks} blocked
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  Blocked Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{taskStats.blocked}</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Tasks currently blocked and need attention
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  View Blocked Tasks
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <CalendarDays className="h-5 w-5" />
                  Overdue Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{taskStats.overdue}</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Tasks that have passed their due date
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  View Overdue Tasks
                </Button>
              </CardContent>
            </Card>
          </div>

          {(taskStats.blocked > 0 || taskStats.overdue > 0) && (
            <Card className="border-warning bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  Action Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {taskStats.blocked > 0 && (
                    <p>• <strong>{taskStats.blocked}</strong> blocked tasks need to be unblocked to resume progress</p>
                  )}
                  {taskStats.overdue > 0 && (
                    <p>• <strong>{taskStats.overdue}</strong> overdue tasks require immediate attention</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
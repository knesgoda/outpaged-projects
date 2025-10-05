import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FolderOpen, 
  CheckSquare, 
  Users, 
  Calendar, 
  Clock,
  ArrowRight,
  Plus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TaskManagementDashboard } from "@/components/dashboard/TaskManagementDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { enableOutpagedBrand } from "@/lib/featureFlags";
import { FilterChip } from "@/components/outpaged/FilterChip";
import { StatusChip } from "@/components/outpaged/StatusChip";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { format } from "date-fns";

function OutpagedDashboard() {
  const { user } = useAuth();
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [handoffItems, setHandoffItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch assigned tasks with project details
        const { data: tasksData } = await supabase
          .from('tasks')
          .select(`
            *,
            project:projects(id, name, code)
          `)
          .or(`assignee_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (tasksData) {
          setAssignedTasks(tasksData);
        }

        // Fetch handoffs
        const { data: handoffsData } = await supabase
          .from('handoffs')
          .select('*')
          .or(`created_by.eq.${user.id},accepted_by.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (handoffsData) {
          setHandoffItems(handoffsData);
        }

        // Get default project for task creation
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (projects && projects.length > 0) {
          setDefaultProjectId(projects[0].id);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done': return { label: 'Done', variant: 'success' as const };
      case 'in_progress': return { label: 'In Progress', variant: 'accent' as const };
      case 'in_review': return { label: 'In Review', variant: 'warning' as const };
      default: return { label: 'Todo', variant: 'neutral' as const };
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(var(--muted-foreground))]">
              Overview
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))]">My Work</h1>
          </div>
          <Button 
            className="rounded-full bg-[hsl(var(--accent))] px-6 py-2 text-sm font-semibold text-white shadow-soft hover:bg-[hsl(var(--accent))]/90"
            onClick={() => setShowCreateTask(true)}
            disabled={!defaultProjectId}
          >
            Create item
          </Button>
        </div>

      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="rounded-3xl border-none shadow-soft">
          <CardContent className="p-6">
            <Tabs defaultValue="assigned" className="space-y-6">
              <TabsList className="h-auto w-full justify-start gap-2 rounded-full bg-[hsl(var(--chip-neutral))]/40 p-1">
                <TabsTrigger
                  value="assigned"
                  className="rounded-full px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-soft"
                >
                  Assigned
                </TabsTrigger>
                <TabsTrigger
                  value="approvals"
                  className="rounded-full px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-soft"
                >
                  Approvals
                </TabsTrigger>
                <TabsTrigger
                  value="handoffs"
                  className="rounded-full px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-soft"
                >
                  Handoffs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assigned" className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : assignedTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No tasks assigned yet</div>
                ) : (
                  assignedTasks.map((task) => {
                    const statusInfo = getStatusLabel(task.status);
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="flex items-center justify-between gap-4 rounded-3xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] px-4 py-4 shadow-soft cursor-pointer hover:bg-[hsl(var(--accent))]/5 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                              {task.project?.code ? `${task.project.code}-${task.ticket_number}` : `TASK-${task.ticket_number}`}
                            </p>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">•</span>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{task.project?.name || 'No Project'}</p>
                          </div>
                          <p className="text-sm font-medium text-[hsl(var(--foreground))]">{task.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusChip variant={statusInfo.variant}>{statusInfo.label}</StatusChip>
                          {task.due_date && (
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                              Due {format(new Date(task.due_date), 'MMM dd')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="approvals" className="space-y-3">
                <div className="text-center py-8 text-muted-foreground">No pending approvals</div>
              </TabsContent>

              <TabsContent value="handoffs" className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : handoffItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No handoffs yet</div>
                ) : (
                  handoffItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 rounded-3xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] px-4 py-4 shadow-soft"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                          {item.from_team} → {item.to_team}
                        </p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                          {item.handoff_type} • {item.status}
                        </p>
                      </div>
                      <StatusChip variant={item.status === 'completed' ? 'success' : 'warning'}>
                        {item.status}
                      </StatusChip>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-soft">
            <CardContent className="space-y-4 p-6">
              <div>
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Today</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Keep momentum with these moments.</p>
              </div>
              <div className="text-center py-8 text-sm text-muted-foreground">
                No events scheduled for today
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-soft">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Notifications</h2>
                <StatusChip variant="neutral">Live</StatusChip>
              </div>
              <div className="text-center py-8 text-sm text-muted-foreground">
                No new notifications
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Dialog */}
      {selectedTask && (
        <TaskDialog
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={() => {
            setSelectedTask(null);
            window.location.reload();
          }}
          projectId={selectedTask.project?.id}
        />
      )}

      {/* Create Task Dialog */}
      {defaultProjectId && (
        <CreateTaskDialog
          open={showCreateTask}
          onOpenChange={setShowCreateTask}
          projectId={defaultProjectId}
          onTaskCreated={() => {
            setShowCreateTask(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  if (enableOutpagedBrand) {
    return <OutpagedDashboard />;
  }

  return <LegacyDashboard />;
}

function LegacyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [stats, setStats] = useState({
    projects: 0,
    tasks: 0,
    completedTasks: 0,
    activeProjects: 0
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;


      // Calculate stats
      const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;

      setStats({
        projects: projects?.length || 0,
        tasks: tasks?.length || 0,
        completedTasks,
        activeProjects
      });

      setRecentProjects(projects?.slice(0, 3) || []);
      setRecentTasks(tasks?.slice(0, 5) || []);
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'default';
      case 'completed':
      case 'done':
        return 'secondary';
      case 'on_hold':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const statCards = [
    {
      title: "Total Projects",
      value: stats.projects,
      description: `${stats.activeProjects} active`,
      icon: FolderOpen,
      color: "text-primary",
      onClick: () => navigate('/dashboard/projects')
    },
    {
      title: "Total Tasks",
      value: stats.tasks,
      description: `${stats.completedTasks} completed`,
      icon: CheckSquare,
      color: "text-success",
      onClick: () => navigate('/dashboard/tasks')
    },
    {
      title: "Team Members",
      value: 1,
      description: "Active members",
      icon: Users,
      color: "text-accent",
      onClick: () => navigate('/dashboard/team')
    },
    {
      title: "This Week",
      value: stats.tasks,
      description: "Tasks created",
      icon: Calendar,
      color: "text-warning",
      onClick: () => navigate('/dashboard/analytics')
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your project overview.</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => navigate('/dashboard/projects')}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card 
            key={card.title} 
            className="hover:shadow-soft transition-all cursor-pointer"
            onClick={card.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>


       {/* Enhanced Task Management Section */}
       <div className="space-y-6">
         <div className="flex items-center justify-between">
           <h2 className="text-2xl font-semibold">Task Management Overview</h2>
           <Button
             variant="outline"
             size="sm"
             onClick={() => navigate('/dashboard/board')}
           >
             Open Kanban Board
             <ArrowRight className="w-4 h-4 ml-1" />
           </Button>
         </div>
         <TaskManagementDashboard />
       </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions />
        </div>

        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  Recent Projects
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard/projects')}
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No projects yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate('/dashboard/projects')}
                    >
                      Create Your First Project
                    </Button>
                  </div>
                ) : (
                  recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(project.status)}>
                        {formatStatus(project.status)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Recent Tasks
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/tasks')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/dashboard/tasks')}
                >
                  Create Your First Task
                </Button>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/dashboard/tasks')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.projects?.name || "Unknown Project"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(task.status)}>
                    {formatStatus(task.status)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

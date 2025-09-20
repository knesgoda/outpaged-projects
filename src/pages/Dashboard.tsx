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

const TEAM_FILTERS = [
  { label: "All work", count: 12, initial: "A" },
  { label: "Mobile", count: 9, initial: "M" },
  { label: "Web", count: 7, initial: "W" },
  { label: "Backend", count: 4, initial: "B" },
  { label: "Marketing", count: 3, initial: "M" },
  { label: "Ops", count: 2, initial: "O" },
];

const ASSIGNED_TASKS = [
  {
    id: "OP-1289",
    title: "Library UI polish",
    status: { label: "In Review", variant: "success" as const },
    handoff: { label: "Design", variant: "accent" as const },
    handoffStatus: { label: "Handoff pending", variant: "warning" as const },
    due: { label: "Due today", variant: "warning" as const },
    team: "Mobile",
  },
  {
    id: "OP-1311",
    title: "Brand launch toolkit",
    status: { label: "Packaged", variant: "success" as const },
    handoff: { label: "Marketing", variant: "accent" as const },
    handoffStatus: { label: "Ready", variant: "success" as const },
    due: { label: "Handoff pending", variant: "warning" as const },
    team: "Marketing",
  },
  {
    id: "OP-1334",
    title: "Customer journey audit",
    status: { label: "In Progress", variant: "accent" as const },
    handoff: { label: "Ops", variant: "neutral" as const },
    handoffStatus: { label: "Awaiting brief", variant: "neutral" as const },
    due: { label: "Due tomorrow", variant: "accent" as const },
    team: "Ops",
  },
];

const APPROVAL_TASKS = [
  {
    id: "OP-1290",
    title: "Executive summary deck",
    owner: "Alyssa Chen",
    status: { label: "Waiting on you", variant: "warning" as const },
  },
  {
    id: "OP-1302",
    title: "Design QA checklist",
    owner: "Maria Nguyen",
    status: { label: "Approved", variant: "success" as const },
  },
];

const HANDOFF_ITEMS = [
  {
    id: "OP-1275",
    title: "Mobile UI kit export",
    owner: "Jacob Riess",
    due: "Apr 18",
    status: { label: "Ready", variant: "success" as const },
  },
  {
    id: "OP-1331",
    title: "Localization brief",
    owner: "Samira Ali",
    due: "Apr 19",
    status: { label: "Needs review", variant: "warning" as const },
  },
];

const TODAY_SCHEDULE = [
  { time: "11:00am – 12:00pm", title: "Product team sync" },
  { time: "2:30pm – 3:00pm", title: "Website updates review" },
  { time: "4:15pm", title: "Bug OP-1353 due today" },
];

const NOTIFICATIONS = [
  { title: "3 handoffs ready", detail: "Engineering", badge: "View" },
  { title: "Marketing needs approval", detail: "CTA refresh", badge: "Open" },
];

function OutpagedDashboard() {
  const [activeTeam, setActiveTeam] = useState<string>(TEAM_FILTERS[0].label);
  const visibleAssignments = ASSIGNED_TASKS.filter((task) =>
    activeTeam === TEAM_FILTERS[0].label ? true : task.team === activeTeam
  );

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
          <Button className="rounded-full bg-[hsl(var(--accent))] px-6 py-2 text-sm font-semibold text-white shadow-soft hover:bg-[hsl(var(--accent))]/90">
            Create item
          </Button>
        </div>

            <div className="flex flex-wrap gap-2">
              {TEAM_FILTERS.map((filter) => (
                <FilterChip
                  key={filter.label}
                  active={activeTeam === filter.label}
                  count={filter.count}
                  leading={filter.initial}
                  onClick={() => setActiveTeam(filter.label)}
                >
                  {filter.label}
                </FilterChip>
              ))}
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
                <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1.4fr)_minmax(0,140px)_minmax(0,140px)_minmax(0,120px)] gap-4 rounded-2xl bg-[hsl(var(--chip-neutral))]/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <span>ID</span>
                  <span>Task</span>
                  <span>Status</span>
                  <span>Handoff</span>
                  <span>Due</span>
                </div>

                {visibleAssignments.map((task) => (
                  <div
                    key={task.id}
                    className="grid grid-cols-[minmax(0,120px)_minmax(0,1.4fr)_minmax(0,140px)_minmax(0,140px)_minmax(0,120px)] items-center gap-4 rounded-3xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] px-4 py-4 shadow-soft"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{task.id}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{task.team}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{task.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{task.handoff.label}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <StatusChip variant={task.status.variant}>{task.status.label}</StatusChip>
                    </div>
                    <div className="flex flex-col gap-2">
                      <StatusChip variant={task.handoffStatus.variant}>{task.handoffStatus.label}</StatusChip>
                      <StatusChip variant="accent">{task.handoff.label}</StatusChip>
                    </div>
                    <StatusChip size="md" variant={task.due.variant} className="justify-self-start">
                      {task.due.label}
                    </StatusChip>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="approvals" className="space-y-3">
                {APPROVAL_TASKS.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-3xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] px-4 py-4 shadow-soft"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {item.id} • Owner: {item.owner}
                      </p>
                    </div>
                    <StatusChip variant={item.status.variant}>{item.status.label}</StatusChip>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="handoffs" className="space-y-3">
                {HANDOFF_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-3xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] px-4 py-4 shadow-soft"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {item.id} • Due {item.due} • {item.owner}
                      </p>
                    </div>
                    <StatusChip variant={item.status.variant}>{item.status.label}</StatusChip>
                  </div>
                ))}
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
              <div className="space-y-3">
                {TODAY_SCHEDULE.map((event) => (
                  <div
                    key={event.title}
                    className="rounded-2xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--chip-neutral))]/35 px-4 py-3 text-left"
                  >
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{event.title}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{event.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-soft">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Notifications</h2>
                <StatusChip variant="neutral">Live</StatusChip>
              </div>
              <div className="space-y-3">
                {NOTIFICATIONS.map((notification) => (
                  <div
                    key={notification.title}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--chip-neutral))]/30 px-4 py-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{notification.title}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{notification.detail}</p>
                    </div>
                    {notification.badge && <StatusChip variant="accent">{notification.badge}</StatusChip>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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

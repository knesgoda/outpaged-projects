import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';

interface AnalyticsData {
  tasksCompleted: number;
  tasksCompletedLastMonth: number;
  hoursTracked: number;
  hoursTrackedLastMonth: number;
  teamEfficiency: number;
  teamEfficiencyLastMonth: number;
  blockedTasks: number;
  blockedTasksLastMonth: number;
}

interface Project {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
  tasksCompleted: number;
  hoursWorked: number;
  efficiency: number;
}

export default function Reports() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: new Date(),
  });
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    tasksCompleted: 0,
    tasksCompletedLastMonth: 0,
    hoursTracked: 0,
    hoursTrackedLastMonth: 0,
    teamEfficiency: 0,
    teamEfficiencyLastMonth: 0,
    blockedTasks: 0,
    blockedTasksLastMonth: 0,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projectPerformanceData, setProjectPerformanceData] = useState<any[]>([]);
  const [taskDistributionData, setTaskDistributionData] = useState<any[]>([]);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
      fetchProjects();
    }
  }, [user, dateRange, selectedProject]);

  const fetchAnalyticsData = async () => {
    if (!user || !dateRange.from || !dateRange.to) return;

    try {
      setLoading(true);
      
      // Get current period data
      const currentPeriodStart = dateRange.from.toISOString();
      const currentPeriodEnd = dateRange.to.toISOString();
      
      // Get last month's data for comparison
      const lastMonthStart = startOfMonth(subMonths(dateRange.from, 1)).toISOString();
      const lastMonthEnd = startOfMonth(dateRange.from).toISOString();

      // Build query filters
      let tasksQuery = supabase
        .from('tasks')
        .select('*', { count: 'exact' });

      if (selectedProject !== 'all') {
        tasksQuery = tasksQuery.eq('project_id', selectedProject);
      }

      // Current period tasks
      const { data: currentTasks, count: currentTasksCount } = await tasksQuery
        .gte('created_at', currentPeriodStart)
        .lte('created_at', currentPeriodEnd);

      // Completed tasks in current period
      const { count: completedTasksCount } = await tasksQuery
        .eq('status', 'done')
        .gte('updated_at', currentPeriodStart)
        .lte('updated_at', currentPeriodEnd);

      // For now, we'll consider "todo" tasks as potentially blocked
      // In a real implementation, you might add a separate "blocked" field
      const { count: blockedTasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('status', 'todo')
        .gte('created_at', currentPeriodStart)
        .lte('created_at', currentPeriodEnd);

      // Last month's completed tasks
      const { count: lastMonthCompletedCount } = await tasksQuery
        .eq('status', 'done')
        .gte('updated_at', lastMonthStart)
        .lt('updated_at', lastMonthEnd);

      // Time tracking data
      let currentTimeEntries;
      let lastMonthTimeEntries;
      
      if (selectedProject !== 'all') {
        // Get time entries for specific project
        const { data: projectTimeEntries } = await supabase
          .from('time_entries')
          .select('duration_minutes, tasks!inner(project_id)')
          .eq('tasks.project_id', selectedProject)
          .gte('started_at', currentPeriodStart)
          .lte('started_at', currentPeriodEnd);
        
        const { data: projectLastMonthTimeEntries } = await supabase
          .from('time_entries')
          .select('duration_minutes, tasks!inner(project_id)')
          .eq('tasks.project_id', selectedProject)
          .gte('started_at', lastMonthStart)
          .lt('started_at', lastMonthEnd);
          
        currentTimeEntries = projectTimeEntries;
        lastMonthTimeEntries = projectLastMonthTimeEntries;
      } else {
        // Get all time entries
        const { data: allCurrentTimeEntries } = await supabase
          .from('time_entries')
          .select('duration_minutes')
          .gte('started_at', currentPeriodStart)
          .lte('started_at', currentPeriodEnd);

        const { data: allLastMonthTimeEntries } = await supabase
          .from('time_entries')
          .select('duration_minutes')
          .gte('started_at', lastMonthStart)
          .lt('started_at', lastMonthEnd);
          
        currentTimeEntries = allCurrentTimeEntries;
        lastMonthTimeEntries = allLastMonthTimeEntries;
      }

      // Calculate hours
      const currentHours = Math.round((currentTimeEntries?.reduce((sum, entry) => 
        sum + (entry.duration_minutes || 0), 0) || 0) / 60);
      const lastMonthHours = Math.round((lastMonthTimeEntries?.reduce((sum, entry) => 
        sum + (entry.duration_minutes || 0), 0) || 0) / 60);

      // Calculate efficiency (tasks completed vs tasks created)
      const currentEfficiency = currentTasksCount ? 
        Math.round((completedTasksCount || 0) / currentTasksCount * 100) : 0;
      const lastMonthEfficiency = 75; // Placeholder for now

      setAnalyticsData({
        tasksCompleted: completedTasksCount || 0,
        tasksCompletedLastMonth: lastMonthCompletedCount || 0,
        hoursTracked: currentHours,
        hoursTrackedLastMonth: lastMonthHours,
        teamEfficiency: currentEfficiency,
        teamEfficiencyLastMonth: lastMonthEfficiency,
        blockedTasks: blockedTasksCount || 0,
        blockedTasksLastMonth: 0, // Placeholder
      });

      // Task distribution data
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('status')
        .gte('created_at', currentPeriodStart)
        .lte('created_at', currentPeriodEnd);

      const statusCounts = allTasks?.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const colors = {
        todo: '#6b7280',
        in_progress: '#f59e0b',
        in_review: '#3b82f6',
        done: '#22c55e'
      };

      setTaskDistributionData([
        { name: 'To Do', value: statusCounts.todo || 0, color: colors.todo },
        { name: 'In Progress', value: statusCounts.in_progress || 0, color: colors.in_progress },
        { name: 'In Review', value: statusCounts.in_review || 0, color: colors.in_review },
        { name: 'Done', value: statusCounts.done || 0, color: colors.done },
      ].filter(item => item.value > 0));

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const handleExport = () => {
    // Export report logic would go here
    toast({
      title: "Export Report",
      description: "Report export functionality coming soon!",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Comprehensive insights into project and team performance
          </p>
        </div>
        <Button onClick={handleExport} className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                    onSelect={(range) => setDateRange(range || {})}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="frontend">Frontend Team</SelectItem>
                  <SelectItem value="backend">Backend Team</SelectItem>
                  <SelectItem value="design">Design Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select defaultValue="overview">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="executive">Executive Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold">
                  {loading ? "..." : analyticsData.tasksCompleted}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {(() => {
                    const change = calculatePercentChange(
                      analyticsData.tasksCompleted,
                      analyticsData.tasksCompletedLastMonth
                    );
                    return (
                      <>
                        {change >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-success" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-destructive" />
                        )}
                        <span className={change >= 0 ? "text-success" : "text-destructive"}>
                          {change >= 0 ? "+" : ""}{change}%
                        </span>
                        <span className="text-muted-foreground">vs last month</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-full">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hours Tracked</p>
                <p className="text-2xl font-bold">
                  {loading ? "..." : analyticsData.hoursTracked.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {(() => {
                    const change = calculatePercentChange(
                      analyticsData.hoursTracked,
                      analyticsData.hoursTrackedLastMonth
                    );
                    return (
                      <>
                        {change >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-success" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-destructive" />
                        )}
                        <span className={change >= 0 ? "text-success" : "text-destructive"}>
                          {change >= 0 ? "+" : ""}{change}%
                        </span>
                        <span className="text-muted-foreground">vs last month</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-full">
                <Users className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Team Efficiency</p>
                <p className="text-2xl font-bold">
                  {loading ? "..." : `${analyticsData.teamEfficiency}%`}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {(() => {
                    const change = calculatePercentChange(
                      analyticsData.teamEfficiency,
                      analyticsData.teamEfficiencyLastMonth
                    );
                    return (
                      <>
                        {change >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-success" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-destructive" />
                        )}
                        <span className={change >= 0 ? "text-success" : "text-destructive"}>
                          {change >= 0 ? "+" : ""}{change}%
                        </span>
                        <span className="text-muted-foreground">vs last month</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blocked Tasks</p>
                <p className="text-2xl font-bold">
                  {loading ? "..." : analyticsData.blockedTasks}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {(() => {
                    const change = calculatePercentChange(
                      analyticsData.blockedTasks,
                      analyticsData.blockedTasksLastMonth
                    );
                    return (
                      <>
                        {change <= 0 ? (
                          <TrendingDown className="w-3 h-3 text-success" />
                        ) : (
                          <TrendingUp className="w-3 h-3 text-destructive" />
                        )}
                        <span className={change <= 0 ? "text-success" : "text-destructive"}>
                          {change >= 0 ? "+" : ""}{change}%
                        </span>
                        <span className="text-muted-foreground">vs last month</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="burndown">Burndown</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Project Progress
                </CardTitle>
                <CardDescription>Weekly task completion breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-muted-foreground">Loading chart data...</div>
                  </div>
                ) : projectPerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                      <Bar dataKey="inProgress" fill="#f59e0b" name="In Progress" />
                      <Bar dataKey="todo" fill="#6b7280" name="To Do" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available for the selected period
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  Task Distribution
                </CardTitle>
                <CardDescription>Current state of all tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-muted-foreground">Loading chart data...</div>
                  </div>
                ) : taskDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={taskDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {taskDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No tasks found for the selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Team Performance
              </CardTitle>
              <CardDescription>Individual team member metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading team performance data...</div>
                </div>
              ) : teamMembers.length > 0 ? (
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{member.name}</h4>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{member.tasksCompleted} tasks</span>
                          <span>{member.hoursWorked}h tracked</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={member.efficiency >= 90 ? "default" : member.efficiency >= 80 ? "secondary" : "destructive"}
                        >
                          {member.efficiency}% efficiency
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No team performance data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="burndown" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sprint Burndown Chart</CardTitle>
              <CardDescription>Progress tracking for current sprint</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Sprint burndown charts coming soon!</p>
                  <p className="text-sm">Feature will be available when sprint tracking is implemented</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Velocity</CardTitle>
              <CardDescription>Sprint velocity and commitment tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Team velocity tracking coming soon!</p>
                  <p className="text-sm">Feature will be available when sprint planning is fully implemented</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
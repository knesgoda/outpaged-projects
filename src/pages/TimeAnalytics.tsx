import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Users, 
  Target,
  BarChart3,
  PieChart
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface TimeStats {
  totalHours: number;
  totalTasks: number;
  avgHoursPerTask: number;
  weeklyHours: number;
}

interface DailyTimeData {
  date: string;
  hours: number;
  tasks: number;
}

interface TaskTimeData {
  taskTitle: string;
  totalHours: number;
  entries: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function TimeAnalytics() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: startOfWeek(subDays(new Date(), 7)),
    to: endOfWeek(new Date()),
  });
  const [stats, setStats] = useState<TimeStats>({
    totalHours: 0,
    totalTasks: 0,
    avgHoursPerTask: 0,
    weeklyHours: 0,
  });
  const [dailyData, setDailyData] = useState<DailyTimeData[]>([]);
  const [taskData, setTaskData] = useState<TaskTimeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTimeAnalytics = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch time entries for the selected date range  
      const { data: timeEntries, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', dateRange.from.toISOString())
        .lte('started_at', dateRange.to.toISOString())
        .not('duration_minutes', 'is', null)
        .order('started_at', { ascending: true });

      // Separately fetch task details
      let taskDetails = new Map();
      if (timeEntries && timeEntries.length > 0) {
        const taskIds = [...new Set(timeEntries.map(entry => entry.task_id))];
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', taskIds);
        
        if (tasks) {
          tasks.forEach(task => {
            taskDetails.set(task.id, task);
          });
        }
      }

      if (error) throw error;

      // Calculate stats
      const totalMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
      const totalHours = totalMinutes / 60;
      const uniqueTasks = new Set(timeEntries?.map(entry => entry.task_id)).size;
      const avgHoursPerTask = uniqueTasks > 0 ? totalHours / uniqueTasks : 0;

      // Get weekly hours
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      const weeklyEntries = timeEntries?.filter(entry => {
        const entryDate = new Date(entry.started_at);
        return entryDate >= weekStart && entryDate <= weekEnd;
      }) || [];
      const weeklyMinutes = weeklyEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
      const weeklyHours = weeklyMinutes / 60;

      setStats({
        totalHours,
        totalTasks: uniqueTasks,
        avgHoursPerTask,
        weeklyHours,
      });

      // Prepare daily data
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const dailyMap = new Map();

      // Initialize all days with 0
      days.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        dailyMap.set(dateKey, { date: format(day, 'MMM d'), hours: 0, tasks: new Set() });
      });

      // Populate with actual data
      timeEntries?.forEach(entry => {
        const entryDate = format(new Date(entry.started_at), 'yyyy-MM-dd');
        if (dailyMap.has(entryDate)) {
          const day = dailyMap.get(entryDate);
          day.hours += (entry.duration_minutes || 0) / 60;
          day.tasks.add(entry.task_id);
        }
      });

      const dailyArray = Array.from(dailyMap.values()).map(day => ({
        ...day,
        hours: Math.round(day.hours * 10) / 10,
        tasks: day.tasks.size,
      }));

      setDailyData(dailyArray);

      // Prepare task data
      const taskMap = new Map();
      timeEntries?.forEach(entry => {
        const task = taskDetails.get(entry.task_id);
        const taskTitle = task?.title || 'Unknown Task';
        if (!taskMap.has(entry.task_id)) {
          taskMap.set(entry.task_id, {
            taskTitle,
            totalHours: 0,
            entries: 0,
          });
        }
        const taskStats = taskMap.get(entry.task_id);
        taskStats.totalHours += (entry.duration_minutes || 0) / 60;
        taskStats.entries += 1;
      });

      const taskArray = Array.from(taskMap.values())
        .map(task => ({
          ...task,
          totalHours: Math.round(task.totalHours * 10) / 10,
        }))
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 10); // Top 10 tasks

      setTaskData(taskArray);

    } catch (error: any) {
      console.error('Error fetching time analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTimeAnalytics();
    }
  }, [user, dateRange]);

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${Math.round(hours * 10) / 10}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Time Analytics</h1>
          <p className="text-muted-foreground">
            Track your productivity and time allocation
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "Pick a date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => {
                  if (range?.from) {
                    setDateRange({
                      from: range.from,
                      to: range.to || range.from,
                    });
                  }
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(stats.totalHours)}</div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Worked</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Unique tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Task</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(stats.avgHoursPerTask)}</div>
            <p className="text-xs text-muted-foreground">
              Average time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatHours(stats.weeklyHours)}</div>
            <p className="text-xs text-muted-foreground">
              Weekly hours
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Time Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatHours(value), 'Hours']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Top Tasks by Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskData.slice(0, 5).map((task, index) => (
                <div key={task.taskTitle} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm truncate">{task.taskTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {task.entries} entries
                    </Badge>
                    <span className="text-sm font-medium">{formatHours(task.totalHours)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Time Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [formatHours(value), 'Hours']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
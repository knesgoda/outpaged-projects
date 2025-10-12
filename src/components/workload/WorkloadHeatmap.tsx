import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { startOfWeek, addDays, format, addWeeks, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

interface WorkloadData {
  user_id: string;
  full_name: string;
  week_start: string;
  total_hours: number;
  effective_capacity: number;
  utilization: number;
  projects: Array<{ name: string; hours: number }>;
}

export function WorkloadHeatmap() {
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weeks = Array.from({ length: 8 }, (_, i) => addWeeks(currentWeekStart, i));

  useEffect(() => {
    fetchWorkloadData();
  }, [weekOffset]);

  const fetchWorkloadData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks with assignees for the date range
      const startDate = currentWeekStart.toISOString();
      const endDate = addWeeks(currentWeekStart, 8).toISOString();

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          estimated_hours,
          due_date,
          project:projects(name),
          assignees:task_assignees(
            user:profiles(user_id, full_name)
          )
        `)
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .not('estimated_hours', 'is', null);

      if (error) throw error;

      // Process data by user and week
      const dataMap = new Map<string, WorkloadData>();

      tasks?.forEach((task: any) => {
        task.assignees?.forEach((assignment: any) => {
          const user = assignment.user;
          if (!user) return;

          const dueDate = new Date(task.due_date);
          const weekStart = startOfWeek(dueDate, { weekStartsOn: 1 });
          const weekKey = `${user.user_id}-${format(weekStart, 'yyyy-MM-dd')}`;

          if (!dataMap.has(weekKey)) {
            dataMap.set(weekKey, {
              user_id: user.user_id,
              full_name: user.full_name || 'Unknown',
              week_start: format(weekStart, 'yyyy-MM-dd'),
              total_hours: 0,
              effective_capacity: 40, // Default 40h/week, should come from person settings
              utilization: 0,
              projects: []
            });
          }

          const entry = dataMap.get(weekKey)!;
          entry.total_hours += task.estimated_hours || 0;
          
          const projectName = task.project?.name || 'Unknown';
          const existingProject = entry.projects.find(p => p.name === projectName);
          if (existingProject) {
            existingProject.hours += task.estimated_hours || 0;
          } else {
            entry.projects.push({ name: projectName, hours: task.estimated_hours || 0 });
          }
        });
      });

      // Calculate utilization
      dataMap.forEach(entry => {
        entry.utilization = (entry.total_hours / entry.effective_capacity) * 100;
      });

      setWorkloadData(Array.from(dataMap.values()));
    } catch (error) {
      console.error('Error fetching workload:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 110) return 'bg-red-500/20 border-red-500';
    if (utilization >= 95) return 'bg-yellow-500/20 border-yellow-500';
    if (utilization >= 85) return 'bg-green-500/20 border-green-500';
    return 'bg-muted border-border';
  };

  const getUtilizationLabel = (utilization: number) => {
    if (utilization >= 110) return 'Overloaded';
    if (utilization >= 95) return 'At Capacity';
    if (utilization >= 85) return 'Healthy';
    return 'Under-utilized';
  };

  // Get unique users
  const users = Array.from(new Set(workloadData.map(d => d.user_id)))
    .map(userId => {
      const userData = workloadData.find(d => d.user_id === userId);
      return { id: userId, name: userData?.full_name || 'Unknown' };
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading workload data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(weekOffset - 4)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(weekOffset + 4)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border bg-muted" />
            <span className="text-muted-foreground">&lt;85%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border bg-green-500/20 border-green-500" />
            <span className="text-muted-foreground">85-95%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border bg-yellow-500/20 border-yellow-500" />
            <span className="text-muted-foreground">95-110%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border bg-red-500/20 border-red-500" />
            <span className="text-muted-foreground">&gt;110%</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="grid grid-cols-[200px_repeat(8,1fr)] border-b bg-muted/50">
            <div className="p-3 font-medium">Person</div>
            {weeks.map((week, i) => (
              <div key={i} className="p-3 text-center text-sm font-medium border-l">
                <div>{format(week, 'MMM d')}</div>
                <div className="text-xs text-muted-foreground">Week {format(week, 'w')}</div>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No workload data available for this period
            </div>
          ) : (
            users.map(user => (
              <div key={user.id} className="grid grid-cols-[200px_repeat(8,1fr)] border-b hover:bg-muted/30">
                <div className="p-3 font-medium">{user.name}</div>
                {weeks.map((week, i) => {
                  const weekKey = format(week, 'yyyy-MM-dd');
                  const cellData = workloadData.find(
                    d => d.user_id === user.id && d.week_start === weekKey
                  );

                  return (
                    <TooltipProvider key={i}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`p-3 border-l text-center cursor-pointer transition-colors ${
                              cellData ? getUtilizationColor(cellData.utilization) : 'bg-muted/20'
                            }`}
                          >
                            {cellData ? (
                              <div>
                                <div className="text-sm font-medium">
                                  {cellData.utilization.toFixed(0)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {cellData.total_hours}h
                                </div>
                                {cellData.utilization >= 110 && (
                                  <AlertTriangle className="h-3 w-3 mx-auto mt-1 text-red-500" />
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        {cellData && (
                          <TooltipContent side="bottom" className="max-w-xs">
                            <div className="space-y-2">
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Week of {format(week, 'MMM d, yyyy')}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Utilization:</span>
                                  <Badge variant="outline">
                                    {getUtilizationLabel(cellData.utilization)}
                                  </Badge>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Allocated:</span>
                                  <span className="font-medium">{cellData.total_hours}h</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Capacity:</span>
                                  <span className="font-medium">{cellData.effective_capacity}h</span>
                                </div>
                              </div>
                              {cellData.projects.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium mb-1">Projects:</div>
                                  {cellData.projects.map((project, idx) => (
                                    <div key={idx} className="text-xs flex justify-between">
                                      <span>{project.name}</span>
                                      <span className="text-muted-foreground">{project.hours}h</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

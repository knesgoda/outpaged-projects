import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  Target,
  Activity,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useResourceWorkload, type ResourceTimeframe } from "@/hooks/useResourceWorkload";
import { useTelemetry } from "@/components/telemetry/TelemetryProvider";
import { format } from "date-fns";

interface ResourceManagementProps {
  projectId: string;
}

export const ResourceManagement = ({ projectId }: ResourceManagementProps) => {
  const [timeframe, setTimeframe] = useState<ResourceTimeframe>("week");
  const { toast } = useToast();
  const telemetry = useTelemetry();

  const {
    data: workloads,
    loading,
    error,
    lastUpdated,
    range,
  } = useResourceWorkload(projectId, timeframe);

  useEffect(() => {
    if (error) {
      toast({
        title: "Unable to forecast capacity",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!lastUpdated || workloads.length === 0) return;
    const totalHours = workloads.reduce((sum, workload) => sum + workload.taskHours, 0);
    const averageUtilization = workloads.reduce((sum, workload) => sum + workload.utilization, 0) / workloads.length;
    telemetry.track("capacity.forecast_generated", {
      projectId,
      timeframe,
      members: workloads.length,
      totalHours,
      averageUtilization,
      refreshedAt: lastUpdated.toISOString(),
    });
  }, [lastUpdated, projectId, telemetry, timeframe, workloads]);

  const summary = useMemo(() => {
    const totalTasks = workloads.reduce((sum, workload) => sum + workload.taskCount, 0);
    const totalUrgent = workloads.reduce((sum, workload) => sum + workload.urgentTaskCount, 0);
    const averageCompletion = workloads.length
      ? Math.round(workloads.reduce((sum, workload) => sum + workload.completionRate, 0) / workloads.length)
      : 0;
    const averageUtilization = workloads.length
      ? Math.round(workloads.reduce((sum, workload) => sum + workload.utilization, 0) / workloads.length)
      : 0;
    const totalPlannedHours = workloads.reduce((sum, workload) => sum + workload.taskHours, 0);
    return { totalTasks, totalUrgent, averageCompletion, averageUtilization, totalPlannedHours };
  }, [workloads]);

  const distribution = useMemo(() => {
    const balanced = workloads.filter((workload) => workload.utilization < 80).length;
    const focused = workloads.filter((workload) => workload.utilization >= 80 && workload.utilization < 100).length;
    const overloaded = workloads.filter((workload) => workload.utilization >= 100).length;
    return { balanced, focused, overloaded };
  }, [workloads]);

  const rangeLabel = useMemo(() => {
    if (!range) return "";
    return `${format(range.start, "MMM d")} – ${format(range.end, "MMM d")}`;
  }, [range]);

  const getWorkloadStatus = (utilization: number, urgentTasks: number) => {
    if (utilization >= 120 || urgentTasks >= 3) return { status: "overloaded", color: "destructive" as const };
    if (utilization >= 100 || urgentTasks >= 2) return { status: "high", color: "default" as const };
    if (utilization >= 85) return { status: "focused", color: "secondary" as const };
    return { status: "balanced", color: "outline" as const };
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 85) return "text-green-600";
    if (rate >= 65) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Resource Management
          </h2>
          <p className="text-muted-foreground">
            Monitor team workload and capacity ({rangeLabel})
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">Refreshed {format(lastUpdated, "MMM d, HH:mm")}</p>
          )}
        </div>
        <Select value={timeframe} onValueChange={(value) => setTimeframe(value as ResourceTimeframe)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Team Size</span>
          </div>
          <div className="text-2xl font-bold">{workloads.length}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Planned Hours</span>
          </div>
          <div className="text-2xl font-bold">{summary.totalPlannedHours.toFixed(1)}h</div>
          <p className="text-xs text-muted-foreground mt-1">Across {summary.totalTasks} scheduled tasks</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Urgent Tasks</span>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {summary.totalUrgent}
          </div>
          <p className="text-xs text-muted-foreground mt-1">High priority work requiring attention</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Utilization Outlook</span>
          </div>
          <div className="text-2xl font-bold">{summary.averageUtilization}%</div>
          <p className="text-xs text-muted-foreground mt-1">Avg completion {summary.averageCompletion}%</p>
        </Card>
      </div>

      {/* Team Member Workloads */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Team Workload Analysis
        </h3>

        <div className="space-y-4">
          {workloads.map((workload) => {
            const workloadStatus = getWorkloadStatus(workload.utilization, workload.urgentTaskCount);
            const capacityPercentage = Math.min(workload.utilization, 130);
            const initials = workload.fullName
              .split(" ")
              .map((part) => part?.[0])
              .filter(Boolean)
              .join("")
              .slice(0, 2)
              .toUpperCase() || "U";
            const topSkill = [...workload.skills].sort((a, b) => b.experiencePoints - a.experiencePoints)[0];
            const remainingCapacity = Math.max(0, workload.availableHours - workload.taskHours);

            return (
              <div
                key={workload.userId}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Avatar>
                    <AvatarImage src={workload.avatarUrl ?? undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium">{workload.fullName}</h4>
                      {topSkill && (
                        <Badge variant="outline" className="text-xs">
                          {topSkill.skill}
                        </Badge>
                      )}
                      <Badge variant={workloadStatus.color} className="text-xs capitalize">
                        {workloadStatus.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>{workload.taskCount} tasks</span>
                      <span>{workload.taskHours.toFixed(1)}h planned</span>
                      <span>{remainingCapacity.toFixed(1)}h remaining</span>
                      {workload.urgentTaskCount > 0 && (
                        <span className="text-red-600">
                          {workload.urgentTaskCount} urgent
                        </span>
                      )}
                      <span className={getCompletionRateColor(workload.completionRate)}>
                        {workload.completionRate}% complete
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>{workload.availableHours.toFixed(1)}h capacity</span>
                      {workload.oooHours > 0 && (
                        <span className="text-amber-600">{workload.oooHours.toFixed(1)}h OOO</span>
                      )}
                      {workload.busyHours > 0 && (
                        <span>{workload.busyHours.toFixed(1)}h meetings</span>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Utilization</span>
                        <span>{Math.round(workload.utilization)}%</span>
                      </div>
                      <Progress value={capacityPercentage} className="h-2" />
                    </div>
                  </div>
                </div>

                <Button variant="ghost" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {workloads.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="text-lg font-medium mb-2">No Team Members</h4>
            <p className="text-muted-foreground">
              Add team members to the project to see resource management data
            </p>
          </div>
        )}
      </Card>

      {/* Workload Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Workload Distribution
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
            <div className="text-2xl font-bold text-green-600">{distribution.balanced}</div>
            <div className="text-sm text-green-600">Under 80% utilization</div>
          </div>

          <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
            <div className="text-2xl font-bold text-yellow-600">{distribution.focused}</div>
            <div className="text-sm text-yellow-600">80-100% utilization</div>
          </div>

          <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
            <div className="text-2xl font-bold text-red-600">{distribution.overloaded}</div>
            <div className="text-sm text-red-600">Over capacity</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
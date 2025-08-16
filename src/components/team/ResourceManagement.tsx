import React, { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string;
}

interface TaskWorkload {
  user_id: string;
  task_count: number;
  total_hours: number;
  urgent_tasks: number;
  completion_rate: number;
}

interface ResourceManagementProps {
  projectId: string;
}

export const ResourceManagement = ({ projectId }: ResourceManagementProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [workloads, setWorkloads] = useState<TaskWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("week");
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      fetchResourceData();
    }
  }, [projectId, timeframe]);

  const fetchResourceData = async () => {
    try {
      setLoading(true);

      // Fetch team members
      const { data: members, error: membersError } = await supabase
        .from("project_members_with_profiles")
        .select("user_id, full_name, avatar_url")
        .eq("project_id", projectId);

      if (membersError) throw membersError;

      // Fetch task assignments and workload data
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          status,
          priority,
          created_at
        `)
        .eq("project_id", projectId);

      if (tasksError) throw tasksError;

      // Calculate workloads - simplified for now
      const workloadMap = new Map<string, TaskWorkload>();
      
      members?.forEach(member => {
        workloadMap.set(member.user_id, {
          user_id: member.user_id,
          task_count: Math.floor(Math.random() * 10), // Mock data for now
          total_hours: Math.floor(Math.random() * 40),
          urgent_tasks: Math.floor(Math.random() * 3),
          completion_rate: Math.floor(Math.random() * 100),
        });
      });

      setTeamMembers(members || []);
      setWorkloads(Array.from(workloadMap.values()));
    } catch (error: any) {
      console.error("Error fetching resource data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch resource data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadStatus = (taskCount: number, urgentTasks: number) => {
    if (urgentTasks > 2) return { status: "overloaded", color: "destructive" };
    if (taskCount > 8) return { status: "high", color: "default" };
    if (taskCount > 4) return { status: "moderate", color: "secondary" };
    return { status: "light", color: "outline" };
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
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
            Monitor team workload and capacity
          </p>
        </div>
        <Select value={timeframe} onValueChange={setTimeframe}>
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
          <div className="text-2xl font-bold">{teamMembers.length}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Active Tasks</span>
          </div>
          <div className="text-2xl font-bold">
            {workloads.reduce((sum, w) => sum + w.task_count, 0)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Urgent Tasks</span>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {workloads.reduce((sum, w) => sum + w.urgent_tasks, 0)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Avg Completion</span>
          </div>
          <div className="text-2xl font-bold">
            {Math.round(workloads.reduce((sum, w) => sum + w.completion_rate, 0) / workloads.length || 0)}%
          </div>
        </Card>
      </div>

      {/* Team Member Workloads */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Team Workload Analysis
        </h3>

        <div className="space-y-4">
          {teamMembers.map((member) => {
            const workload = workloads.find(w => w.user_id === member.user_id) || {
              user_id: member.user_id,
              task_count: 0,
              total_hours: 0,
              urgent_tasks: 0,
              completion_rate: 0,
            };

            const workloadStatus = getWorkloadStatus(workload.task_count, workload.urgent_tasks);
            const capacityPercentage = Math.min((workload.task_count / 10) * 100, 100);

            return (
              <div key={member.user_id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <Avatar>
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback>
                      {member.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{member.full_name}</h4>
                      <Badge variant="outline" className="text-xs">
                        Member
                      </Badge>
                      <Badge variant={workloadStatus.color as any} className="text-xs">
                        {workloadStatus.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{workload.task_count} tasks</span>
                      {workload.urgent_tasks > 0 && (
                        <span className="text-red-600">
                          {workload.urgent_tasks} urgent
                        </span>
                      )}
                      <span className={getCompletionRateColor(workload.completion_rate)}>
                        {workload.completion_rate}% completion
                      </span>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Capacity</span>
                        <span>{Math.round(capacityPercentage)}%</span>
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

        {teamMembers.length === 0 && (
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
            <div className="text-2xl font-bold text-green-600">
              {workloads.filter(w => w.task_count <= 4).length}
            </div>
            <div className="text-sm text-green-600">Light Workload</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
            <div className="text-2xl font-bold text-yellow-600">
              {workloads.filter(w => w.task_count > 4 && w.task_count <= 8).length}
            </div>
            <div className="text-sm text-yellow-600">Moderate Workload</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
            <div className="text-2xl font-bold text-red-600">
              {workloads.filter(w => w.task_count > 8).length}
            </div>
            <div className="text-sm text-red-600">High Workload</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle } from "lucide-react";

interface WorkloadData {
  user_id: string;
  full_name: string;
  avatar_url: string;
  total_tasks: number;
  in_progress_tasks: number;
  total_story_points: number;
}

interface WorkloadViewProps {
  projectId?: string;
}

export function WorkloadView({ projectId }: WorkloadViewProps) {
  const [workload, setWorkload] = useState<WorkloadData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkload();
  }, [projectId]);

  const fetchWorkload = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('task_assignees')
        .select(`
          user_id,
          profiles:user_id (
            full_name,
            avatar_url
          ),
          tasks (
            id,
            status,
            story_points
          )
        `);

      if (projectId) {
        query = query.eq('tasks.project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate workload by user
      const workloadMap = new Map<string, WorkloadData>();

      data?.forEach((assignment: any) => {
        const userId = assignment.user_id;
        const task = assignment.tasks;
        const profile = assignment.profiles;

        if (!workloadMap.has(userId)) {
          workloadMap.set(userId, {
            user_id: userId,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url || '',
            total_tasks: 0,
            in_progress_tasks: 0,
            total_story_points: 0,
          });
        }

        const userWorkload = workloadMap.get(userId)!;
        userWorkload.total_tasks++;
        
        if (task?.status === 'in_progress') {
          userWorkload.in_progress_tasks++;
        }
        
        if (task?.story_points) {
          userWorkload.total_story_points += task.story_points;
        }
      });

      setWorkload(Array.from(workloadMap.values()));
    } catch (error: any) {
      console.error('Error fetching workload:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadColor = (points: number) => {
    if (points >= 40) return 'bg-red-500';
    if (points >= 25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getWorkloadStatus = (points: number) => {
    if (points >= 40) return 'Overloaded';
    if (points >= 25) return 'At Capacity';
    return 'Available';
  };

  if (loading) {
    return <div className="text-center py-8">Loading workload data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Team Workload
        </h2>
        <p className="text-muted-foreground">
          Visualize capacity and identify bottlenecks across the team
        </p>
      </div>

      <div className="grid gap-4">
        {workload.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No workload data available
            </CardContent>
          </Card>
        ) : (
          workload.map((user) => (
            <Card key={user.user_id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{user.full_name}</CardTitle>
                      <CardDescription>
                        {user.total_tasks} tasks • {user.in_progress_tasks} in progress
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getWorkloadColor(user.total_story_points)} text-white`}>
                      {user.total_story_points} pts
                    </Badge>
                    <Badge variant="outline">
                      {getWorkloadStatus(user.total_story_points)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">
                      {user.total_story_points} / 40 story points
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all ${getWorkloadColor(user.total_story_points)}`}
                      style={{ width: `${Math.min((user.total_story_points / 40) * 100, 100)}%` }}
                    />
                  </div>
                  {user.total_story_points >= 40 && (
                    <div className="flex items-center gap-2 text-xs text-red-500">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Over capacity - consider reassignment</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

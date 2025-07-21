import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { formatDistanceToNow } from "date-fns";
import { 
  Activity, 
  MessageSquare, 
  UserPlus, 
  CheckCircle, 
  ArrowRight,
  Calendar,
  FileText,
  Users,
  Zap,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'comment_added' | 'user_assigned' | 'project_created';
  title: string;
  description: string;
  user_name: string;
  user_avatar?: string;
  task_title?: string;
  project_name?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

const activityIcons = {
  task_created: FileText,
  task_updated: ArrowRight,
  task_completed: CheckCircle,
  comment_added: MessageSquare,
  user_assigned: UserPlus,
  project_created: Users,
};

const activityColors = {
  task_created: "text-blue-600 bg-blue-100",
  task_updated: "text-orange-600 bg-orange-100",
  task_completed: "text-green-600 bg-green-100",
  comment_added: "text-purple-600 bg-purple-100",
  user_assigned: "text-indigo-600 bg-indigo-100",
  project_created: "text-pink-600 bg-pink-100",
};

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
  showTitle?: boolean;
  className?: string;
}

export function ActivityFeed({ 
  projectId, 
  limit = 20, 
  showTitle = true, 
  className 
}: ActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      // Fetch recent task activities
      let taskQuery = supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          created_at,
          updated_at,
          project_id,
          assignee_id,
          reporter_id,
          projects!inner(name),
          reporter:profiles!tasks_reporter_id_fkey(full_name, avatar_url),
          assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url)
        `)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (projectId) {
        taskQuery = taskQuery.eq('project_id', projectId);
      }

      const { data: tasks } = await taskQuery;

      // Fetch recent comments separately
      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          task_id,
          author_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Get author details and task info for comments
      const commentActivities: ActivityItem[] = [];
      if (commentsData) {
        for (const comment of commentsData) {
          const { data: author } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', comment.author_id)
            .single();

          const { data: task } = await supabase
            .from('tasks')
            .select('title, project_id, projects!inner(name)')
            .eq('id', comment.task_id)
            .single();

          if (task && (!projectId || task.project_id === projectId)) {
            commentActivities.push({
              id: `comment-${comment.id}`,
              type: 'comment_added',
              title: 'Added comment',
              description: comment.content.length > 100 
                ? `${comment.content.substring(0, 100)}...` 
                : comment.content,
              user_name: author?.full_name || 'Unknown',
              user_avatar: author?.avatar_url,
              task_title: task.title,
              project_name: task.projects?.name,
              created_at: comment.created_at
            });
          }
        }
      }

      // Transform task data into activity items
      const taskActivities: ActivityItem[] = (tasks || []).map(task => {
        const isNew = new Date(task.created_at).getTime() === new Date(task.updated_at).getTime();
        return {
          id: `task-${task.id}`,
          type: isNew ? 'task_created' : (task.status === 'done' ? 'task_completed' : 'task_updated'),
          title: isNew ? 'Created task' : (task.status === 'done' ? 'Completed task' : 'Updated task'),
          description: `${task.title}`,
          user_name: task.reporter?.full_name || 'Unknown',
          user_avatar: task.reporter?.avatar_url,
          task_title: task.title,
          project_name: task.projects?.name,
          created_at: isNew ? task.created_at : task.updated_at,
          metadata: { status: task.status, assignee: task.assignee?.full_name }
        };
      });

      // Combine and sort all activities
      const allActivities = [...taskActivities, ...commentActivities]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);

      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [projectId, limit]);

  // Real-time updates
  useRealtime({
    table: 'tasks',
    onInsert: () => fetchActivities(),
    onUpdate: () => fetchActivities(),
  });

  useRealtime({
    table: 'comments',
    onInsert: () => fetchActivities(),
  });

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const groupedActivities = activities.reduce((groups, activity) => {
    const today = new Date();
    const activityDate = new Date(activity.created_at);
    const diffInDays = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let group = 'Today';
    if (diffInDays === 1) group = 'Yesterday';
    else if (diffInDays > 1 && diffInDays <= 7) group = 'This Week';
    else if (diffInDays > 7) group = 'Older';
    
    if (!groups[group]) groups[group] = [];
    groups[group].push(activity);
    return groups;
  }, {} as Record<string, ActivityItem[]>);

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Feed
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      {showTitle && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Feed
              <Badge variant="secondary" className="ml-2">
                {activities.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No recent activity
              </h3>
              <p className="text-sm text-muted-foreground">
                Activity will appear here when team members create tasks, add comments, or make updates.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedActivities).map(([group, groupActivities]) => (
                <div key={group}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                    {group}
                  </h4>
                  <div className="space-y-4">
                    {groupActivities.map((activity, index) => {
                      const IconComponent = activityIcons[activity.type];
                      const colorClass = activityColors[activity.type];
                      
                      return (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full",
                            colorClass
                          )}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarImage src={activity.user_avatar} />
                                    <AvatarFallback className="text-xs">
                                      {activity.user_name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">
                                    {activity.user_name}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {activity.title.toLowerCase()}
                                  </span>
                                </div>
                                
                                <p className="text-sm mt-1 line-clamp-2">
                                  <span className="font-medium">{activity.task_title}</span>
                                  {activity.type === 'comment_added' && (
                                    <>
                                      <br />
                                      <span className="text-muted-foreground italic">
                                        "{activity.description}"
                                      </span>
                                    </>
                                  )}
                                </p>
                                
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                  </span>
                                  {activity.project_name && (
                                    <Badge variant="outline" className="text-xs">
                                      {activity.project_name}
                                    </Badge>
                                  )}
                                  {activity.metadata?.status === 'done' && (
                                    <Badge variant="default" className="text-xs bg-green-500">
                                      Completed
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {group !== 'Older' && <Separator className="mt-6" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, CheckSquare, Database, Activity, AlertTriangle, Clock, TrendingUp } from "lucide-react";

interface SystemMetrics {
  activeUsers: number;
  totalTasks: number;
  storageUsed: string;
  apiCalls: number;
}

interface RecentActivity {
  id: string;
  action: string;
  entity_type: string;
  user_email: string;
  created_at: string;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeUsers: 0,
    totalTasks: 0,
    storageUsed: '0 MB',
    apiCalls: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch active users (users active in last 30 days)
      const { count: activeUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch total tasks
      const { count: totalTasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      // Fetch recent activity from audit log
      const { data: activityData } = await supabase
        .from('audit_log')
        .select('id, action, entity_type, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get user emails for activity
      const activityWithEmails = await Promise.all(
        (activityData || []).map(async (activity) => {
          if (!activity.user_id) return { ...activity, user_email: 'System' };
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', activity.user_id)
            .single();
          
          return {
            ...activity,
            user_email: profile?.full_name || 'Unknown'
          };
        })
      );

      setMetrics({
        activeUsers: activeUsersCount || 0,
        totalTasks: totalTasksCount || 0,
        storageUsed: '125 MB', // Placeholder - would need storage API
        apiCalls: 1247 // Placeholder - would track in analytics
      });

      setRecentActivity(activityWithEmails);

      // Mock alerts - in production these would come from monitoring
      setAlerts([
        {
          id: '1',
          type: 'warning',
          message: 'Database connection pool at 80% capacity',
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Activity className="h-4 w-4 text-info" />;
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          System overview and workspace metrics
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.storageUsed}</div>
            <p className="text-xs text-muted-foreground">
              Total storage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.apiCalls}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Recent Activity
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{activity.action}</Badge>
                          <Badge variant="secondary">{activity.entity_type}</Badge>
                        </div>
                        <p className="text-sm mt-1">
                          by <span className="font-medium">{activity.user_email}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active alerts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border ${
                        alert.type === 'error'
                          ? 'bg-destructive/10 border-destructive/20'
                          : alert.type === 'warning'
                          ? 'bg-warning/10 border-warning/20'
                          : 'bg-info/10 border-info/20'
                      }`}
                    >
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

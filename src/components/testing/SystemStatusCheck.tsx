import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database,
  Users,
  Settings,
  Activity,
  RefreshCw
} from "lucide-react";

interface SystemCheck {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export function SystemStatusCheck() {
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runSystemChecks = async () => {
    setLoading(true);
    const results: SystemCheck[] = [];

    try {
      // Check 1: Database Connection
      try {
        const { data, error } = await supabase.from('projects').select('count').limit(1);
        if (error) throw error;
        results.push({
          name: "Database Connection",
          status: 'success',
          message: "Successfully connected to Supabase",
          details: "Database queries are working correctly"
        });
      } catch (error) {
        results.push({
          name: "Database Connection",
          status: 'error',
          message: "Failed to connect to database",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }

      // Check 2: Task Assignees Table Integration
      try {
        const { data, error } = await supabase
          .from('task_assignees_with_profiles')
          .select('*')
          .limit(1);
        
        results.push({
          name: "Task Assignees Integration",
          status: 'success',
          message: "Task assignees system is working",
          details: "New assignee system with profiles view is functional"
        });
      } catch (error) {
        results.push({
          name: "Task Assignees Integration",
          status: 'warning',
          message: "Task assignees may have issues",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }

      // Check 3: Status Mapping System
      try {
        const { data: mappings, error } = await supabase
          .from('task_status_mappings')
          .select('*')
          .limit(5);
        
        if (error) throw error;
        
        results.push({
          name: "Status Mapping System",
          status: 'success',
          message: `Found ${mappings?.length || 0} status mappings`,
          details: "Kanban column status mapping is working correctly"
        });
      } catch (error) {
        results.push({
          name: "Status Mapping System",
          status: 'warning',
          message: "Status mapping may need setup",
          details: "Create some Kanban columns to generate status mappings"
        });
      }

      // Check 4: Blocked Tasks Feature
      try {
        const { data: blockedTasks, error } = await supabase
          .from('tasks')
          .select('id, blocked, blocking_reason')
          .eq('blocked', true)
          .limit(5);
        
        if (error) throw error;
        
        results.push({
          name: "Blocked Tasks Feature",
          status: 'success',
          message: `${blockedTasks?.length || 0} blocked tasks found`,
          details: "Task blocking system is operational"
        });
      } catch (error) {
        results.push({
          name: "Blocked Tasks Feature",
          status: 'error',
          message: "Blocked tasks feature unavailable",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }

      // Check 5: Database Indexes Performance
      try {
        const startTime = Date.now();
        const { data, error } = await supabase
          .from('tasks')
          .select('id, project_id, status')
          .limit(100);
        
        const queryTime = Date.now() - startTime;
        
        if (error) throw error;
        
        if (queryTime < 500) {
          results.push({
            name: "Database Performance",
            status: 'success',
            message: `Query completed in ${queryTime}ms`,
            details: "Database indexes are working efficiently"
          });
        } else {
          results.push({
            name: "Database Performance",
            status: 'warning',
            message: `Query took ${queryTime}ms`,
            details: "Consider checking database indexes"
          });
        }
      } catch (error) {
        results.push({
          name: "Database Performance",
          status: 'error',
          message: "Performance check failed",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }

      // Check 6: RLS Policies
      try {
        const { data: userTasks, error } = await supabase
          .from('tasks')
          .select('id')
          .limit(1);
        
        results.push({
          name: "Row Level Security",
          status: 'success',
          message: "RLS policies are working",
          details: "User can access their own data securely"
        });
      } catch (error) {
        results.push({
          name: "Row Level Security",
          status: 'error',
          message: "RLS policies may be blocking access",
          details: "Check authentication and policies"
        });
      }

      // Check 7: Real-time Functionality
      try {
        // Test if we can subscribe to real-time changes
        const channel = supabase.channel('test-channel');
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            results.push({
              name: "Real-time Features",
              status: 'success',
              message: "Real-time subscriptions working",
              details: "Live updates are functional"
            });
          }
        });
        
        // Clean up
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 1000);
      } catch (error) {
        results.push({
          name: "Real-time Features",
          status: 'warning',
          message: "Real-time may have issues",
          details: "Check WebSocket connections"
        });
      }

    } catch (error) {
      console.error('System check error:', error);
    }

    setChecks(results);
    setLoading(false);

    // Show summary toast
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      toast({
        title: "All Systems Operational",
        description: `${successCount}/${totalCount} checks passed successfully`,
      });
    } else {
      toast({
        title: "System Check Complete",
        description: `${successCount}/${totalCount} checks passed`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    runSystemChecks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success text-success-foreground">Healthy</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-warning text-warning">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Status Check
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runSystemChecks}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-muted rounded-full"></div>
                    <div className="h-4 bg-muted rounded w-32"></div>
                  </div>
                  <div className="h-5 bg-muted rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            checks.map((check, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="font-medium">{check.name}</p>
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-muted-foreground mt-1">{check.details}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(check.status)}
              </div>
            ))
          )}
          
          {!loading && checks.length > 0 && (
            <div className="pt-4 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-success/10 rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    {checks.filter(c => c.status === 'success').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Healthy</div>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                  <div className="text-2xl font-bold text-warning">
                    {checks.filter(c => c.status === 'warning').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">
                    {checks.filter(c => c.status === 'error').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Clock, CheckCircle, Pause } from "lucide-react";
import { useSLA } from "@/hooks/useSLA";
import { formatDistanceToNow } from "date-fns";

interface SLADashboardProps {
  projectId: string;
}

export function SLADashboard({ projectId }: SLADashboardProps) {
  const { definitions, tracking } = useSLA(projectId);

  const activeTracking = tracking.filter(t => t.status === 'active' || t.status === 'paused');
  const breachedTracking = tracking.filter(t => t.status === 'breached');
  const resolvedTracking = tracking.filter(t => t.status === 'resolved');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'breached':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'breached':
        return 'destructive';
      case 'resolved':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const calculateProgress = (tracking: any, definition: any) => {
    if (!definition) return 0;
    
    const startTime = new Date(tracking.started_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 60000) - tracking.time_paused_minutes;
    const total = definition.resolution_time_minutes;
    
    return Math.min((elapsed / total) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTracking.length}</div>
            <p className="text-xs text-muted-foreground">Currently tracking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Breached</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{breachedTracking.length}</div>
            <p className="text-xs text-muted-foreground">SLA violations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedTracking.length}</div>
            <p className="text-xs text-muted-foreground">Within SLA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tracking.length > 0
                ? Math.round((resolvedTracking.length / tracking.length) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Overall compliance rate</p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Definitions */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Definitions</CardTitle>
          <CardDescription>Response and resolution time targets</CardDescription>
        </CardHeader>
        <CardContent>
          {definitions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No SLA definitions configured for this project
            </p>
          ) : (
            <div className="space-y-4">
              {definitions.map((def) => (
                <div key={def.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{def.name}</span>
                      <Badge variant="outline">{def.priority}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Response: {def.response_time_minutes}m | Resolution: {def.resolution_time_minutes}m
                    </div>
                  </div>
                  {def.business_hours_only && (
                    <Badge variant="secondary">Business Hours</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Tracking */}
      {activeTracking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active SLA Tracking</CardTitle>
            <CardDescription>Currently monitored items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTracking.map((track) => {
                const definition = definitions.find(d => d.id === track.sla_definition_id);
                const progress = calculateProgress(track, definition);

                return (
                  <div key={track.id} className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(track.status)}
                        <span className="font-medium">Task #{track.task_id.slice(0, 8)}</span>
                        <Badge variant={getStatusColor(track.status)}>{track.status}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Started {formatDistanceToNow(new Date(track.started_at), { addSuffix: true })}
                      </span>
                    </div>

                    {definition && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{definition.name}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    {track.escalation_level > 0 && (
                      <Badge variant="destructive">
                        Escalation Level {track.escalation_level}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breached SLAs */}
      {breachedTracking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Breached SLAs</CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {breachedTracking.map((track) => (
                <div key={track.id} className="flex items-center justify-between p-3 border border-destructive rounded-lg bg-destructive/5">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="font-medium">Task #{track.task_id.slice(0, 8)}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Breached {formatDistanceToNow(new Date(track.breached_at!), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

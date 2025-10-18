import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOperations } from '@/contexts/OperationsContext';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export function SLATracker() {
  const { tasks } = useOperations();

  const getSLABadge = (status?: string) => {
    switch (status) {
      case 'breached':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            SLA Breached
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-warning text-warning">
            <Clock className="w-3 h-3" />
            At Risk
          </Badge>
        );
      case 'ok':
        return (
          <Badge variant="outline" className="flex items-center gap-1 border-success text-success">
            <CheckCircle className="w-3 h-3" />
            On Track
          </Badge>
        );
      default:
        return null;
    }
  };

  const tasksWithSLA = tasks.filter(t => t.sla_definition_id);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">SLA Tracking</h2>
      
      {tasksWithSLA.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">No tasks with SLA tracking</p>
          </CardContent>
        </Card>
      ) : (
        tasksWithSLA.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                {getSLABadge(task.sla_breach_status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Due:</span>
                  <span className="font-medium">
                    {task.sla_response_due
                      ? format(new Date(task.sla_response_due), 'PPp')
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolution Due:</span>
                  <span className="font-medium">
                    {task.sla_resolution_due
                      ? format(new Date(task.sla_resolution_due), 'PPp')
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                    {task.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

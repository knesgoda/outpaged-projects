import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight } from "lucide-react";
import { useHandoffs } from "@/hooks/useHandoffs";
import { formatDistanceToNow } from "date-fns";
import { HandoffChecklistManager } from "./HandoffChecklistManager";

interface HandoffManagerProps {
  taskId?: string;
  projectId?: string;
}

export function HandoffManager({ taskId, projectId }: HandoffManagerProps) {
  const { handoffs, acceptHandoff, rejectHandoff, fetchHandoffs } = useHandoffs(taskId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getHandoffTypeDisplay = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' → ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Handoffs</CardTitle>
        <CardDescription>Track cross-team work transitions</CardDescription>
      </CardHeader>
      <CardContent>
        {handoffs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No handoffs yet
          </p>
        ) : (
          <div className="space-y-4">
            {handoffs.map((handoff) => (
              <Card key={handoff.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{handoff.from_team}</Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{handoff.to_team}</Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {getHandoffTypeDisplay(handoff.handoff_type)}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(handoff.status)}>
                        {handoff.status}
                      </Badge>
                    </div>

                    {handoff.acceptance_checklist && handoff.acceptance_checklist.length > 0 && (
                      <HandoffChecklistManager
                        handoffId={handoff.id}
                        checklist={handoff.acceptance_checklist}
                        status={handoff.status}
                        onChecklistUpdate={() => fetchHandoffs(taskId)}
                      />
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(handoff.created_at), { addSuffix: true })}
                      </span>

                      {handoff.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectHandoff(handoff.id)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => acceptHandoff(handoff.id)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Accept
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

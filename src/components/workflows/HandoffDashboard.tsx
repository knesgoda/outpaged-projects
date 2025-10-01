import { useState, useEffect } from "react";
import { useHandoffs } from "@/hooks/useHandoffs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

interface HandoffDashboardProps {
  projectId?: string;
}

export function HandoffDashboard({ projectId }: HandoffDashboardProps) {
  const { handoffs, loading, acceptHandoff, rejectHandoff, fetchHandoffs } = useHandoffs();
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  useEffect(() => {
    fetchHandoffs();
  }, []);

  const filteredHandoffs = handoffs.filter(h => 
    filter === 'all' || h.status === filter
  );

  const pendingCount = handoffs.filter(h => h.status === 'pending').length;
  const acceptedCount = handoffs.filter(h => h.status === 'accepted').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'accepted': return <CheckCircle2 className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'accepted': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading handoffs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cross-Team Handoffs</h2>
          <p className="text-muted-foreground">
            Manage work transitions between Design, Development, Marketing, and Operations
          </p>
        </div>
        <div className="flex gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{acceptedCount}</div>
              <div className="text-sm text-muted-foreground">Accepted</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
        <TabsList>
          <TabsTrigger value="all">All Handoffs</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredHandoffs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No handoffs found
              </CardContent>
            </Card>
          ) : (
            filteredHandoffs.map((handoff) => (
              <Card key={handoff.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {handoff.from_team} <ArrowRight className="h-4 w-4" /> {handoff.to_team}
                      </CardTitle>
                      <CardDescription>
                        {handoff.handoff_type.replace(/_/g, ' ')}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(handoff.status)}>
                      {getStatusIcon(handoff.status)}
                      <span className="ml-1 capitalize">{handoff.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {handoff.exit_criteria && Object.keys(handoff.exit_criteria).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Exit Criteria:</p>
                      <div className="space-y-1">
                        {Object.entries(handoff.exit_criteria).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-muted-foreground">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {handoff.acceptance_checklist && handoff.acceptance_checklist.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Acceptance Checklist:</p>
                      <div className="space-y-1">
                        {handoff.acceptance_checklist.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className="w-4 h-4 border rounded flex items-center justify-center">
                              {item.completed && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                            </div>
                            <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                              {item.label || item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {handoff.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => acceptHandoff(handoff.id)}
                        className="flex-1"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Accept Handoff
                      </Button>
                      <Button
                        onClick={() => rejectHandoff(handoff.id)}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Created {new Date(handoff.created_at).toLocaleDateString()}
                    {handoff.accepted_at && ` • Accepted ${new Date(handoff.accepted_at).toLocaleDateString()}`}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

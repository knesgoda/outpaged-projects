import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChangeRequest {
  id: string;
  workflow_name: string;
  change_type: 'create' | 'update' | 'delete';
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by_name: string;
  requested_at: string;
  changes: any;
}

export function WorkflowGovernance() {
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<ChangeRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChangeRequests();
  }, []);

  const fetchChangeRequests = async () => {
    try {
      // Mock data - in production, this would fetch from workflow_change_requests table
      const mockRequests: ChangeRequest[] = [
        {
          id: '1',
          workflow_name: 'Software Development Workflow',
          change_type: 'update',
          justification: 'Add code review step before deployment',
          status: 'pending',
          requested_by_name: 'John Smith',
          requested_at: new Date().toISOString(),
          changes: {
            added_states: ['Code Review'],
            added_transitions: [
              { from: 'In Progress', to: 'Code Review' }
            ]
          }
        },
        {
          id: '2',
          workflow_name: 'Bug Triage Workflow',
          change_type: 'update',
          justification: 'Simplify triage process',
          status: 'pending',
          requested_by_name: 'Jane Doe',
          requested_at: new Date(Date.now() - 86400000).toISOString(),
          changes: {
            removed_states: ['Needs Info'],
            updated_transitions: []
          }
        }
      ];

      setPendingRequests(mockRequests.filter(r => r.status === 'pending'));
      setHistoryRequests(mockRequests.filter(r => r.status !== 'pending'));
    } catch (error) {
      console.error('Error fetching change requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    toast({
      title: "Approved",
      description: "Workflow change has been approved and published",
    });
    fetchChangeRequests();
  };

  const handleReject = async (requestId: string) => {
    toast({
      title: "Rejected",
      description: "Workflow change request has been rejected",
    });
    fetchChangeRequests();
  };

  const getChangeTypeBadge = (type: string) => {
    const colors = {
      create: 'default',
      update: 'secondary',
      delete: 'destructive'
    };
    return <Badge variant={colors[type] as any}>{type}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: 'outline' as const, icon: Clock },
      approved: { variant: 'default' as const, icon: CheckCircle },
      rejected: { variant: 'destructive' as const, icon: XCircle }
    };
    const { variant, icon: Icon } = variants[status] || variants.pending;
    
    return (
      <Badge variant={variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="p-6">Loading governance data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Workflow Governance</h2>
        <p className="text-muted-foreground">
          Review and approve workflow change requests
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending change requests</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            <CardTitle className="text-lg">
                              {request.workflow_name}
                            </CardTitle>
                            {getChangeTypeBadge(request.change_type)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Requested by {request.requested_by_name} •{' '}
                            {new Date(request.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Justification</h4>
                        <p className="text-sm text-muted-foreground">
                          {request.justification}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Changes</h4>
                        <div className="space-y-2 text-sm">
                          {request.changes.added_states && (
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="mt-0.5">Added</Badge>
                              <span>
                                States: {request.changes.added_states.join(', ')}
                              </span>
                            </div>
                          )}
                          {request.changes.removed_states && (
                            <div className="flex items-start gap-2">
                              <Badge variant="outline" className="mt-0.5">Removed</Badge>
                              <span>
                                States: {request.changes.removed_states.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          variant="default"
                          onClick={() => handleApprove(request.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No historical change requests</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

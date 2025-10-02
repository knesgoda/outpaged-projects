import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileInbox } from "@/components/mobile/MobileInbox";
import { QuickApprovalCard } from "@/components/mobile/QuickApprovalCard";
import { OfflineQueue } from "@/components/mobile/OfflineQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Inbox, CheckSquare, WifiOff } from "lucide-react";

interface ApprovalRequest {
  id: string;
  task_id: string;
  task_title: string;
  requested_by: string;
  requested_by_name: string;
  status_from: string;
  status_to: string;
  created_at: string;
  notes?: string;
}

export default function MobileView() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchApprovals();
  }, [user]);

  const fetchApprovals = async () => {
    try {
      // In a real implementation, this would fetch from an approval_requests table
      // For now, we'll show a placeholder
      setApprovals([]);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalComplete = () => {
    fetchApprovals();
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mobile Dashboard</h1>
        <p className="text-muted-foreground">
          Quick access to your notifications, approvals, and offline queue
        </p>
      </div>

      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inbox">
            <Inbox className="h-4 w-4 mr-2" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <CheckSquare className="h-4 w-4 mr-2" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="offline">
            <WifiOff className="h-4 w-4 mr-2" />
            Offline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6">
          <MobileInbox />
        </TabsContent>

        <TabsContent value="approvals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading approvals...
                </div>
              ) : approvals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {approvals.map((approval) => (
                      <QuickApprovalCard
                        key={approval.id}
                        approval={approval}
                        onApprovalComplete={handleApprovalComplete}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline" className="mt-6">
          <OfflineQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}

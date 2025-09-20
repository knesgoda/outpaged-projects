import { useState } from "react";
import { CheckCircle2, Smartphone, WifiOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOperations } from "./OperationsProvider";

export function MobileOfflinePanel() {
  const { mobileApprovals, offlineQueue, recordMobileApproval, recordOfflineItem } = useOperations();
  const [approvalDraft, setApprovalDraft] = useState({ itemId: "APP-1", comment: "", status: "approved" });
  const [offlineDraft, setOfflineDraft] = useState({ type: "task", payload: "{}" });

  const handleCreateApproval = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recordMobileApproval({ itemId: approvalDraft.itemId, status: approvalDraft.status as "approved" | "rejected" | "pending", comment: approvalDraft.comment });
    setApprovalDraft({ itemId: "APP-1", comment: "", status: "approved" });
  };

  const handleOfflineCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const payload = JSON.parse(offlineDraft.payload || "{}");
      recordOfflineItem({ type: offlineDraft.type as "task" | "comment", payload });
      setOfflineDraft({ type: "task", payload: "{}" });
    } catch (error) {
      console.error("Invalid JSON", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile approvals & offline queue</CardTitle>
        <CardDescription>
          Allow leaders to approve on the go and ensure offline actions sync once connectivity returns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateApproval} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label htmlFor="mobile-item">Item ID</Label>
            <Input
              id="mobile-item"
              value={approvalDraft.itemId}
              onChange={(event) => setApprovalDraft((prev) => ({ ...prev, itemId: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Status</Label>
            <Select value={approvalDraft.status} onValueChange={(value) => setApprovalDraft((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approve</SelectItem>
                <SelectItem value="rejected">Reject</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-5 space-y-2">
            <Label>Comment</Label>
            <Input
              value={approvalDraft.comment}
              onChange={(event) => setApprovalDraft((prev) => ({ ...prev, comment: event.target.value }))}
              placeholder="Looks good"
            />
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">
              <Smartphone className="h-4 w-4 mr-2" /> Log mobile decision
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          {mobileApprovals.length === 0 ? (
            <p className="text-muted-foreground">No mobile approvals yet.</p>
          ) : (
            mobileApprovals.map((approval) => (
              <Card key={approval.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> {approval.itemId}
                  </CardTitle>
                  <CardDescription>{approval.status} • {approval.comment}</CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <form onSubmit={handleOfflineCreate} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label>Offline type</Label>
            <Select value={offlineDraft.type} onValueChange={(value) => setOfflineDraft((prev) => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="comment">Comment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-9 space-y-2">
            <Label>Payload (JSON)</Label>
            <Input
              value={offlineDraft.payload}
              onChange={(event) => setOfflineDraft((prev) => ({ ...prev, payload: event.target.value }))}
              placeholder='{ "title": "Draft task" }'
            />
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">
              <WifiOff className="h-4 w-4 mr-2" /> Queue offline action
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          {offlineQueue.length === 0 ? (
            <p className="text-muted-foreground">Offline queue is clear.</p>
          ) : (
            offlineQueue.map((entry) => (
              <Card key={entry.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{entry.type}</CardTitle>
                  <CardDescription>Created {new Date(entry.createdAt).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(entry.payload, null, 2)}</pre>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

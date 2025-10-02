import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface QuickApprovalCardProps {
  approval: ApprovalRequest;
  onApprovalComplete: () => void;
}

export function QuickApprovalCard({ approval, onApprovalComplete }: QuickApprovalCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Update task status - ensure valid status type
      const validStatus = ['todo', 'in_progress', 'in_review', 'done'].includes(approval.status_to)
        ? approval.status_to as 'todo' | 'in_progress' | 'in_review' | 'done'
        : 'in_progress';

      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: validStatus })
        .eq('id', approval.task_id);

      if (taskError) throw taskError;

      // Add approval comment
      const commentText = comment ? `✅ Approved: ${comment}` : '✅ Approved';
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          task_id: approval.task_id,
          author_id: user?.id,
          content: commentText,
        });

      if (commentError) throw commentError;

      toast({
        title: "Approved",
        description: "Status change has been approved",
      });

      onApprovalComplete();
    } catch (error) {
      console.error('Error approving:', error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Add rejection comment
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          task_id: approval.task_id,
          author_id: user?.id,
          content: `❌ Rejected: ${comment}`,
        });

      if (commentError) throw commentError;

      toast({
        title: "Rejected",
        description: "Status change has been rejected",
      });

      onApprovalComplete();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <CardTitle className="text-lg">Approval Needed</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            Requested by {approval.requested_by_name}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">{approval.task_title}</h4>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{approval.status_from}</Badge>
            <span>→</span>
            <Badge variant="default">{approval.status_to}</Badge>
          </div>
        </div>

        {approval.notes && (
          <div className="text-sm bg-muted p-3 rounded-lg">
            <p className="text-muted-foreground">{approval.notes}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Comment (optional for approval, required for rejection)</label>
          <Textarea
            placeholder="Add your comments..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            className="flex-1"
            onClick={handleApprove}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleReject}
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

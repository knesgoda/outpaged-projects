import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, X, Shield } from "lucide-react";

interface ApprovalGateProps {
  taskId: string;
  taskTitle: string;
  fromStatus: string;
  toStatus: string;
  requiredRoles: string[];
  onApprove: () => void;
  onReject: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApprovalGate({
  taskId,
  taskTitle,
  fromStatus,
  toStatus,
  requiredRoles,
  onApprove,
  onReject,
  open,
  onOpenChange,
}: ApprovalGateProps) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    setLoading(true);
    try {
      const user = await supabase.auth.getUser();
      
      // Log approval in comments
      if (comments) {
        await supabase.from("comments").insert({
          entity_type: 'task',
          entity_id: taskId,
          author: user.data.user?.id,
          body_markdown: `✅ Approved transition from ${fromStatus} to ${toStatus}\n\n${comments}`,
        } as any);
      }

      toast({
        title: "Transition Approved",
        description: "The status change has been approved",
      });

      onApprove();
    } catch (error: any) {
      console.error("Approval error:", error);
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const user = await supabase.auth.getUser();
      
      // Log rejection in comments
      await supabase.from("comments").insert({
        entity_type: 'task',
        entity_id: taskId,
        author: user.data.user?.id,
        body_markdown: `❌ Rejected transition from ${fromStatus} to ${toStatus}\n\n${comments || "No reason provided"}`,
      } as any);

      toast({
        title: "Transition Rejected",
        description: "The status change has been rejected",
      });

      onReject();
    } catch (error: any) {
      console.error("Rejection error:", error);
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-500" />
            Approval Required
          </DialogTitle>
          <DialogDescription>
            This status transition requires approval from authorized roles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Task</Label>
            <p className="text-sm text-muted-foreground mt-1">{taskTitle}</p>
          </div>

          <div>
            <Label className="text-sm font-medium">Status Change</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{fromStatus}</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="outline">{toStatus}</Badge>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Required Roles</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {requiredRoles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Add approval comments or notes..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={loading}
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

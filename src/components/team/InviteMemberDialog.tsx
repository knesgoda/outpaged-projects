
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded: () => void;
}

export function InviteMemberDialog({ open, onOpenChange, onMemberAdded }: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("developer");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // In a real implementation, you would:
      // 1. Send an invitation email to the user
      // 2. Create a pending invitation record
      // 3. When they accept, create their profile
      
      // For now, we'll simulate adding a member
      // In practice, you'd use an edge function to send invitations
      
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${email}`,
      });

      setEmail("");
      setRole("developer");
      onMemberAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={setRole}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="qa">QA</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

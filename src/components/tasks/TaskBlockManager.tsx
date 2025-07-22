import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { XCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface Task {
  id: string;
  title: string;
  blocked: boolean;
  blocking_reason?: string;
  status: string;
}

interface TaskBlockManagerProps {
  task: Task;
  onUpdate: () => void;
}

export function TaskBlockManager({ task, onUpdate }: TaskBlockManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blockingReason, setBlockingReason] = useState(task.blocking_reason || "");
  const { toast } = useToast();

  const handleBlockTask = async () => {
    if (!blockingReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for blocking this task",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          blocked: true,
          blocking_reason: blockingReason.trim(),
          status: 'todo' // Reset blocked tasks to todo
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Task Blocked",
        description: "Task has been blocked successfully",
      });

      setIsOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error blocking task:', error);
      toast({
        title: "Error",
        description: "Failed to block task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockTask = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          blocked: false,
          blocking_reason: null
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Task Unblocked",
        description: "Task has been unblocked successfully",
      });

      setIsOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error unblocking task:', error);
      toast({
        title: "Error",
        description: "Failed to unblock task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (task.blocked) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Badge variant="destructive" className="cursor-pointer hover:bg-destructive/80">
            <XCircle className="w-3 h-3 mr-1" />
            Blocked
          </Badge>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Task Blocked
            </DialogTitle>
            <DialogDescription>
              This task is currently blocked. Review the blocking reason and unblock when ready.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Blocking Reason</Label>
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive-foreground">
                  {task.blocking_reason}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUnblockTask}
                disabled={loading}
                className="bg-success hover:bg-success/90"
              >
                {loading ? "Unblocking..." : "Unblock Task"}
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-warning hover:text-warning-foreground hover:bg-warning/10">
          <AlertTriangle className="w-4 h-4 mr-1" />
          Block Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Block Task
          </DialogTitle>
          <DialogDescription>
            Blocking a task will prevent it from being moved to in-progress or done status until unblocked.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blocking_reason">Reason for blocking *</Label>
            <Textarea
              id="blocking_reason"
              value={blockingReason}
              onChange={(e) => setBlockingReason(e.target.value)}
              placeholder="Explain why this task needs to be blocked..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlockTask}
              disabled={loading || !blockingReason.trim()}
            >
              {loading ? "Blocking..." : "Block Task"}
              <XCircle className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
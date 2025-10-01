import { Button } from "@/components/ui/button";
import { useAutomatedHandoffs } from "@/hooks/useAutomatedHandoffs";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HANDOFF_FLOWS } from "@/lib/handoffConfig";
import { Badge } from "@/components/ui/badge";

interface HandoffTriggerButtonProps {
  taskId: string;
  taskData: any;
  currentTeam: string;
}

export function HandoffTriggerButton({
  taskId,
  taskData,
  currentTeam,
}: HandoffTriggerButtonProps) {
  const { createAutomatedHandoff } = useAutomatedHandoffs();

  const availableHandoffs = HANDOFF_FLOWS.filter(
    (flow) => flow.fromTeam.toLowerCase() === currentTeam.toLowerCase()
  );

  if (availableHandoffs.length === 0) {
    return null;
  }

  const handleHandoff = async (flowId: string) => {
    const flow = HANDOFF_FLOWS.find((f) => f.id === flowId);
    if (flow) {
      await createAutomatedHandoff(taskId, taskData, flow);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRight className="mr-2 h-4 w-4" />
          Create Handoff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Team Handoff</DialogTitle>
          <DialogDescription>
            Select a handoff flow to transition work to another team
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {availableHandoffs.map((flow) => (
            <div
              key={flow.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{flow.fromTeam}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{flow.toTeam}</Badge>
                </div>
                <p className="text-sm font-medium">{flow.name}</p>
                <p className="text-xs text-muted-foreground">
                  {flow.acceptanceChecklist.length} acceptance criteria
                </p>
              </div>
              <Button onClick={() => handleHandoff(flow.id)} size="sm">
                Create
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

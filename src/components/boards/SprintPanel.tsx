import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, CheckCircle2, Calendar, Target } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { startSprint, completeSprint } from "@/services/boards/sprintService";
import { toast } from "sonner";

interface SprintPanelProps {
  projectId: string;
  activeSprint: any;
  sprintMetrics: any;
  onSprintChange: () => void;
}

export function SprintPanel({ 
  projectId, 
  activeSprint, 
  sprintMetrics,
  onSprintChange 
}: SprintPanelProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  async function handleStartSprint() {
    if (!activeSprint) return;
    
    setIsStarting(true);
    const success = await startSprint(activeSprint.id);
    
    if (success) {
      toast.success("Sprint started");
      onSprintChange();
    } else {
      toast.error("Failed to start sprint");
    }
    
    setIsStarting(false);
  }

  async function handleCompleteSprint() {
    if (!activeSprint) return;
    
    setIsCompleting(true);
    const success = await completeSprint(activeSprint.id);
    
    if (success) {
      toast.success("Sprint completed");
      onSprintChange();
    } else {
      toast.error("Failed to complete sprint");
    }
    
    setIsCompleting(false);
  }

  if (!activeSprint) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">No Active Sprint</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create a sprint to start planning
        </p>
        <Button>
          Create Sprint
        </Button>
      </div>
    );
  }

  const daysRemaining = differenceInDays(
    new Date(activeSprint.end_date),
    new Date()
  );

  const completionPercentage = sprintMetrics
    ? Math.round((sprintMetrics.completedPoints / sprintMetrics.totalPoints) * 100) || 0
    : 0;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 space-y-4 border-b">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            {activeSprint.name}
          </h3>
          {activeSprint.goal && (
            <p className="text-sm text-muted-foreground mt-1">
              {activeSprint.goal}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sprint Progress</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} />
        </div>

        {sprintMetrics && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">
                {sprintMetrics.completedPoints}/{sprintMetrics.totalPoints}
              </div>
              <div className="text-xs text-muted-foreground">Story Points</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-2xl font-bold">
                {sprintMetrics.completedTasks}/{sprintMetrics.totalTasks}
              </div>
              <div className="text-xs text-muted-foreground">Tasks</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(activeSprint.start_date), "MMM d")} -{" "}
              {format(new Date(activeSprint.end_date), "MMM d")}
            </span>
          </div>
          <Badge variant={daysRemaining < 0 ? "destructive" : "secondary"}>
            {daysRemaining < 0 
              ? `${Math.abs(daysRemaining)} days overdue`
              : `${daysRemaining} days left`
            }
          </Badge>
        </div>

        <div className="flex gap-2">
          {activeSprint.status === 'planned' && (
            <Button 
              onClick={handleStartSprint} 
              disabled={isStarting}
              className="flex-1 gap-2"
            >
              <Play className="h-4 w-4" />
              Start Sprint
            </Button>
          )}
          {activeSprint.status === 'active' && (
            <Button 
              onClick={handleCompleteSprint}
              disabled={isCompleting}
              variant="outline"
              className="flex-1 gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Sprint
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="text-sm text-muted-foreground text-center py-4">
            Sprint items will appear here
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

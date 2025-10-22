import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, CheckCircle2, Calendar, Target } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { startSprint, completeSprint } from "@/services/boards/sprintService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SprintPanelProps {
  activeSprint: any;
  sprintMetrics: any;
  onSprintChange: () => void;
  isDragTargetActive?: boolean;
}

export function SprintPanel({
  activeSprint,
  sprintMetrics,
  onSprintChange,
  isDragTargetActive = false
}: SprintPanelProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const pillButtonClass = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-full bg-[#ff7a1a] px-6 py-2 text-sm font-semibold text-white",
    "shadow-[0_0_0_rgba(255,122,26,0.45)] transition-all duration-200",
    "hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(255,153,0,0.65)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a]/60 focus-visible:ring-offset-0",
    "disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
  );

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
      void import("canvas-confetti").then(({ default: confetti }) => {
        confetti({
          particleCount: 160,
          startVelocity: 45,
          spread: 70,
          origin: { y: 0.4 },
          colors: ["#ff7a1a", "#ffd166", "#4ac7ff"],
        });
      }).catch((error) => {
        console.error("Failed to load confetti:", error);
      });
      onSprintChange();
    } else {
      toast.error("Failed to complete sprint");
    }

    setIsCompleting(false);
  }

  if (!activeSprint) {
    return (
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-white/80">
        <AnimatePresence>
          {isDragTargetActive && (
            <motion.div
              className="absolute inset-0 rounded-3xl border border-white/15"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
        <Calendar className="h-12 w-12 text-white/60" />
        <div>
          <h3 className="text-lg font-semibold text-white">No Active Sprint</h3>
          <p className="mt-1 text-sm text-white/60">
            Create a sprint to start planning
          </p>
        </div>
        <Button className={pillButtonClass}>
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
    <div className={cn(
      "relative flex-1 overflow-hidden rounded-3xl",
      "bg-transparent text-white"
    )}>
      <AnimatePresence>
        {isDragTargetActive && (
          <motion.div
            className="absolute inset-0 rounded-3xl border border-[#ffb347]/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, boxShadow: "0 0 40px rgba(255, 153, 0, 0.4)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>
      <div className="relative flex h-full flex-col">
        <div className="space-y-4 border-b border-white/10 p-5">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Target className="h-4 w-4 text-white/70" />
              {activeSprint.name}
            </h3>
            {activeSprint.goal && (
              <p className="mt-2 text-sm text-white/60">
                {activeSprint.goal}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Sprint Progress</span>
              <span className="font-semibold text-white">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2 bg-white/10" />
          </div>

          {sprintMetrics && (
            <div className="grid grid-cols-2 gap-3 text-white">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xl font-bold">
                  {sprintMetrics.completedPoints}/{sprintMetrics.totalPoints}
                </div>
                <div className="text-xs uppercase tracking-wide text-white/60">Story Points</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xl font-bold">
                  {sprintMetrics.completedTasks}/{sprintMetrics.totalTasks}
                </div>
                <div className="text-xs uppercase tracking-wide text-white/60">Tasks</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-white/70">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white/50" />
              <span>
                {format(new Date(activeSprint.start_date), "MMM d")} -{" "}
                {format(new Date(activeSprint.end_date), "MMM d")}
              </span>
            </div>
            <Badge
              variant={daysRemaining < 0 ? "destructive" : "secondary"}
              className="border-white/20 bg-white/10 text-white"
            >
              {daysRemaining < 0
                ? `${Math.abs(daysRemaining)} days overdue`
                : `${daysRemaining} days left`
              }
            </Badge>
          </div>

          <div className="flex gap-3">
            {activeSprint.status === 'planned' && (
              <Button
                onClick={handleStartSprint}
                disabled={isStarting}
                className={cn("flex-1", pillButtonClass)}
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
                className="flex-1 gap-2 rounded-full border-white/30 bg-white/5 text-white transition-colors hover:bg-white/10"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Sprint
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5">
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 py-10 text-center text-sm text-white/60">
              Sprint items will appear here
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

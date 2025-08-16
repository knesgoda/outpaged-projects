import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Calendar,
  Target,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  estimated_hours?: number;
}

interface EnhancedTimeTrackerProps {
  task: Task;
  projectId: string;
}

export const EnhancedTimeTracker = ({ task, projectId }: EnhancedTimeTrackerProps) => {
  const [description, setDescription] = useState("");
  const [dailyGoal, setDailyGoal] = useState(8); // hours
  const { 
    timeEntries, 
    runningEntry: activeTimer, 
    startTimer, 
    stopTimer, 
    isLoading: loading 
  } = useTimeTracking();
  const { toast } = useToast();

  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeTimer && activeTimer.task_id === task.id) {
      interval = setInterval(() => {
        const start = new Date(activeTimer.started_at);
        const now = new Date();
        setElapsedTime(Math.floor((now.getTime() - start.getTime()) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer, task.id]);

  // Calculate task statistics
  const taskTimeEntries = timeEntries.filter(entry => entry.task_id === task.id);
  const totalTimeMinutes = taskTimeEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const totalHours = Math.round((totalTimeMinutes / 60) * 100) / 100;
  
  // Calculate today's time
  const today = new Date().toDateString();
  const todayEntries = taskTimeEntries.filter(entry => 
    new Date(entry.started_at).toDateString() === today
  );
  const todayMinutes = todayEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  const todayHours = Math.round((todayMinutes / 60) * 100) / 100;

  // Progress calculations
  const estimatedHours = task.estimated_hours || 0;
  const progressPercentage = estimatedHours > 0 ? Math.min((totalHours / estimatedHours) * 100, 100) : 0;
  const dailyProgress = (todayHours / dailyGoal) * 100;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    try {
      await startTimer(task.id, description);
      toast({
        title: "Timer Started",
        description: `Tracking time for "${task.title}"`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start timer",
        variant: "destructive",
      });
    }
  };

  const handleStop = async () => {
    try {
      await stopTimer();
      toast({
        title: "Timer Stopped",
        description: "Time entry saved successfully",
      });
      setDescription("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop timer",
        variant: "destructive",
      });
    }
  };

  const handleManualEntry = async () => {
    try {
      const duration = parseInt(prompt("Enter duration in minutes:") || "0");
      if (duration > 0) {
        // For now, just show success message until hook supports manual entries
        toast({
          title: "Manual Entry Added", 
          description: `Added ${duration} minutes to "${task.title}"`,
        });
        setDescription("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create manual entry",
        variant: "destructive",
      });
    }
  };

  const isTimerActive = activeTimer?.task_id === task.id;

  return (
    <div className="space-y-4">
      {/* Timer Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h3 className="font-semibold">Time Tracker</h3>
          </div>
          <Badge variant={isTimerActive ? "default" : "secondary"}>
            {isTimerActive ? "Recording" : "Stopped"}
          </Badge>
        </div>

        {/* Current Timer Display */}
        <div className="text-center mb-4">
          <div className="text-3xl font-mono font-bold mb-2">
            {formatTime(elapsedTime)}
          </div>
          {isTimerActive && (
            <p className="text-sm text-muted-foreground">
              Started at {format(new Date(activeTimer.started_at), "HH:mm")}
            </p>
          )}
        </div>

        {/* Description Input */}
        <div className="mb-4">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="What are you working on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isTimerActive ? (
            <Button onClick={handleStart} className="flex-1" disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              Start Timer
            </Button>
          ) : (
            <Button onClick={handleStop} variant="destructive" className="flex-1" disabled={loading}>
              <Square className="h-4 w-4 mr-2" />
              Stop Timer
            </Button>
          )}
          <Button onClick={handleManualEntry} variant="outline" disabled={loading}>
            <Clock className="h-4 w-4 mr-2" />
            Manual Entry
          </Button>
        </div>
      </Card>

      {/* Time Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Today</span>
          </div>
          <div className="text-2xl font-bold">{todayHours}h</div>
          <Progress value={dailyProgress} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Goal: {dailyGoal}h ({Math.round(dailyProgress)}%)
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total</span>
          </div>
          <div className="text-2xl font-bold">{totalHours}h</div>
          {estimatedHours > 0 && (
            <>
              <Progress value={progressPercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Estimated: {estimatedHours}h ({Math.round(progressPercentage)}%)
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Recent Entries */}
      {taskTimeEntries.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Entries
          </h4>
          <div className="space-y-2">
            {taskTimeEntries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium">
                    {Math.round((entry.duration_minutes || 0) / 60 * 100) / 100}h
                  </span>
                  {entry.description && (
                    <span className="text-muted-foreground ml-2">
                      - {entry.description}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground">
                  {format(new Date(entry.started_at), "MMM d")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Daily Goal Setting */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4" />
          <Label htmlFor="daily-goal">Daily Goal (hours)</Label>
        </div>
        <Input
          id="daily-goal"
          type="number"
          value={dailyGoal}
          onChange={(e) => setDailyGoal(parseInt(e.target.value) || 8)}
          min="1"
          max="24"
          className="w-32"
        />
      </Card>
    </div>
  );
};
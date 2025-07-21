import { useState } from 'react';
import { Play, Pause, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useAuth } from '@/hooks/useAuth';

interface TimeTrackerProps {
  taskId: string;
  taskTitle: string;
}

export function TimeTracker({ taskId, taskTitle }: TimeTrackerProps) {
  const { user } = useAuth();
  const {
    runningEntry,
    startTimer,
    stopTimer,
    getTotalTimeForTask,
    formatDuration,
    getRunningDuration,
  } = useTimeTracking(taskId);
  
  const [description, setDescription] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  const totalTime = getTotalTimeForTask(taskId);
  const isRunning = runningEntry?.task_id === taskId;
  const currentRunningTime = isRunning ? getRunningDuration() : 0;

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await startTimer(taskId, description || undefined);
      setDescription('');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    await stopTimer();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Time Tracking
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Time</div>
            <div className="font-medium">{formatDuration(totalTime)}</div>
          </div>
          
          {isRunning && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Running: {formatDuration(currentRunningTime)}
            </Badge>
          )}
        </div>

        {/* Timer Controls */}
        <div className="space-y-3">
          {!isRunning ? (
            <div className="space-y-2">
              <Input
                placeholder="Optional: What are you working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm"
              />
              <Button
                onClick={handleStart}
                disabled={isStarting}
                className="w-full"
                size="sm"
              >
                <Play className="h-3 w-3 mr-2" />
                {isStarting ? 'Starting...' : 'Start Timer'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {runningEntry?.description && (
                  <span>Working on: {runningEntry.description}</span>
                )}
              </div>
              <Button
                onClick={handleStop}
                variant="destructive"
                className="w-full"
                size="sm"
              >
                <Pause className="h-3 w-3 mr-2" />
                Stop Timer
              </Button>
            </div>
          )}
        </div>

        {/* Task Info */}
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            Tracking time for: <span className="font-medium">{taskTitle}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
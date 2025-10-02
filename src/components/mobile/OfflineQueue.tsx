import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WifiOff, RefreshCw, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QueuedAction {
  id: string;
  type: 'create_task' | 'create_comment' | 'update_task' | 'create_approval';
  data: any;
  timestamp: string;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
}

export function OfflineQueue() {
  const { toast } = useToast();
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Load queue from localStorage
    loadQueue();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Syncing pending changes...",
      });
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Changes will be queued and synced when you're back online",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadQueue = () => {
    try {
      const stored = localStorage.getItem('offline_queue');
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  };

  const saveQueue = (newQueue: QueuedAction[]) => {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(newQueue));
      setQueue(newQueue);
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  };

  const processQueue = async () => {
    if (!isOnline || processing || queue.length === 0) return;

    setProcessing(true);
    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const action = updatedQueue[i];
      if (action.status !== 'pending') continue;

      try {
        updatedQueue[i] = { ...action, status: 'processing' };
        saveQueue(updatedQueue);

        // Simulate API call - in real implementation, call actual Supabase functions
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Remove from queue on success
        updatedQueue.splice(i, 1);
        i--;

        toast({
          title: "Synced",
          description: getActionDescription(action),
        });
      } catch (error) {
        console.error('Error processing action:', error);
        updatedQueue[i] = {
          ...action,
          status: 'failed',
          retries: action.retries + 1,
        };
      }
    }

    saveQueue(updatedQueue);
    setProcessing(false);
  };

  const getActionDescription = (action: QueuedAction): string => {
    switch (action.type) {
      case 'create_task':
        return 'Task created';
      case 'create_comment':
        return 'Comment added';
      case 'update_task':
        return 'Task updated';
      case 'create_approval':
        return 'Approval submitted';
      default:
        return 'Action completed';
    }
  };

  const removeAction = (id: string) => {
    const newQueue = queue.filter(a => a.id !== id);
    saveQueue(newQueue);
    toast({
      title: "Removed from queue",
    });
  };

  const clearQueue = () => {
    saveQueue([]);
    toast({
      title: "Queue cleared",
    });
  };

  if (queue.length === 0 && isOnline) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Offline Queue</CardTitle>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
          </div>
          <div className="flex gap-2">
            {isOnline && queue.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={processQueue}
                disabled={processing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            )}
            {queue.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearQueue}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isOnline && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-warning">
              <WifiOff className="h-4 w-4" />
              <p className="text-sm font-medium">You're currently offline</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your changes are being saved locally and will sync automatically when you're back online.
            </p>
          </div>
        )}

        <ScrollArea className="h-[300px]">
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>All changes synced</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((action) => (
                <div
                  key={action.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">
                          {getActionDescription(action)}
                        </p>
                        <Badge
                          variant={
                            action.status === 'pending' ? 'outline' :
                            action.status === 'processing' ? 'default' :
                            'destructive'
                          }
                        >
                          {action.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(action.timestamp).toLocaleString()}
                      </p>
                      {action.retries > 0 && (
                        <p className="text-xs text-warning mt-1">
                          Retries: {action.retries}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAction(action.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

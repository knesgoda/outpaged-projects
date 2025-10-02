import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface QueuedAction {
  id: string;
  type: 'create_task' | 'create_comment' | 'update_task' | 'create_approval';
  data: any;
  timestamp: string;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
}

export function useOfflineQueue() {
  const { toast } = useToast();
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadQueue();

    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadQueue = useCallback(() => {
    try {
      const stored = localStorage.getItem('offline_queue');
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  }, []);

  const saveQueue = useCallback((newQueue: QueuedAction[]) => {
    try {
      localStorage.setItem('offline_queue', JSON.stringify(newQueue));
      setQueue(newQueue);
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }, []);

  const addToQueue = useCallback((
    type: QueuedAction['type'],
    data: any
  ): string => {
    const id = crypto.randomUUID();
    const action: QueuedAction = {
      id,
      type,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
      status: 'pending',
    };

    const newQueue = [...queue, action];
    saveQueue(newQueue);

    if (!isOnline) {
      toast({
        title: "Saved offline",
        description: "Your changes will sync when you're back online",
      });
    } else {
      processQueue();
    }

    return id;
  }, [queue, isOnline, saveQueue, toast]);

  const processQueue = useCallback(async () => {
    if (!isOnline || processing || queue.length === 0) return;

    setProcessing(true);
    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const action = updatedQueue[i];
      if (action.status !== 'pending') continue;

      try {
        updatedQueue[i] = { ...action, status: 'processing' };
        saveQueue(updatedQueue);

        // Execute the queued action
        // This would call the actual Supabase functions in a real implementation
        await executeAction(action);

        // Remove from queue on success
        updatedQueue.splice(i, 1);
        i--;
      } catch (error) {
        console.error('Error processing action:', error);
        updatedQueue[i] = {
          ...action,
          status: 'failed',
          retries: action.retries + 1,
        };

        // Remove after max retries
        if (action.retries >= 3) {
          updatedQueue.splice(i, 1);
          i--;
          toast({
            title: "Failed to sync",
            description: "Action removed after multiple failed attempts",
            variant: "destructive",
          });
        }
      }
    }

    saveQueue(updatedQueue);
    setProcessing(false);
  }, [isOnline, processing, queue, saveQueue, toast]);

  const executeAction = async (action: QueuedAction): Promise<void> => {
    // Simulate API call - in real implementation, call actual Supabase functions
    await new Promise(resolve => setTimeout(resolve, 1000));

    // This would implement the actual logic for each action type
    switch (action.type) {
      case 'create_task':
        // Call supabase.from('tasks').insert(action.data)
        break;
      case 'create_comment':
        // Call supabase.from('comments').insert(action.data)
        break;
      case 'update_task':
        // Call supabase.from('tasks').update(action.data)
        break;
      case 'create_approval':
        // Call approval logic
        break;
    }
  };

  const removeFromQueue = useCallback((id: string) => {
    const newQueue = queue.filter(a => a.id !== id);
    saveQueue(newQueue);
  }, [queue, saveQueue]);

  const clearQueue = useCallback(() => {
    saveQueue([]);
  }, [saveQueue]);

  return {
    queue,
    isOnline,
    processing,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
  };
}

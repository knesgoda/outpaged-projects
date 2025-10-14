import { useCallback, useEffect, useMemo, useState } from "react";

export interface CreateTaskDialogDefaults {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  smartTaskType?: string;
  assigneeIds?: string[];
  watcherIds?: string[];
  storyPoints?: string;
  startDate?: string;
  dueDate?: string;
  sprintId?: string;
  customFieldValues?: Record<string, unknown>;
}

export interface TaskCreationMeta {
  pending?: boolean;
}

interface UseCreateTaskOptions {
  projectId?: string | null;
  source?: string;
  defaults?: Partial<CreateTaskDialogDefaults>;
  onTaskCreated?: (taskId: string, meta?: TaskCreationMeta) => void;
}

interface OpenCreateTaskOptions extends UseCreateTaskOptions {}

interface InternalDialogState extends UseCreateTaskOptions {
  open: boolean;
}

export function useCreateTask(options: UseCreateTaskOptions = {}) {
  const [state, setState] = useState<InternalDialogState>(() => ({
    open: false,
    projectId: options.projectId ?? null,
    source: options.source,
    defaults: options.defaults,
    onTaskCreated: options.onTaskCreated,
  }));

  useEffect(() => {
    setState(prev => ({
      ...prev,
      projectId: options.projectId ?? prev.projectId ?? null,
      source: options.source ?? prev.source,
      defaults: options.defaults ?? prev.defaults,
      onTaskCreated: options.onTaskCreated ?? prev.onTaskCreated,
    }));
  }, [options.projectId, options.source, options.defaults, options.onTaskCreated]);

  const openCreateTask = useCallback((override?: OpenCreateTaskOptions) => {
    setState(prev => ({
      open: true,
      projectId: override?.projectId ?? options.projectId ?? prev.projectId ?? null,
      source: override?.source ?? options.source ?? prev.source,
      defaults: {
        ...(options.defaults ?? {}),
        ...(override?.defaults ?? {}),
      },
      onTaskCreated: override?.onTaskCreated ?? options.onTaskCreated ?? prev.onTaskCreated,
    }));
  }, [options.defaults, options.onTaskCreated, options.projectId, options.source]);

  const closeCreateTask = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
  }, []);

  const dialogProps = useMemo(() => {
    if (!state.projectId) {
      return undefined;
    }

    return {
      open: state.open,
      onOpenChange: (next: boolean) => {
        if (!next) {
          closeCreateTask();
        }
      },
      projectId: state.projectId,
      source: state.source,
      defaults: state.defaults,
      onTaskCreated: (taskId: string, meta?: TaskCreationMeta) => {
        state.onTaskCreated?.(taskId, meta);
      },
    };
  }, [closeCreateTask, state]);

  return {
    openCreateTask,
    closeCreateTask,
    dialogProps,
  };
}

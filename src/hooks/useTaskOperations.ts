import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateTask } from "@/lib/taskValidation";
import type { TaskWithDetails, TaskWatcher, TaskComponent, TaskVersion, TaskVersionType, TaskCodeReference, CodeReferenceType } from "@/types/tasks";
import { useQueryClient } from "@tanstack/react-query";

export function useTaskOperations(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTask = async (data: Partial<TaskWithDetails>) => {
    // Validate
    const { valid, errors } = validateTask(data);
    if (!valid) {
      toast({ 
        title: 'Validation Error', 
        description: errors.join(', '), 
        variant: 'destructive' 
      });
      return null;
    }
    
    // Create task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title: data.title!,
        description: data.description,
        status: data.status || 'todo',
        priority: data.priority || 'P2',
        task_type: data.task_type || 'task',
        hierarchy_level: data.hierarchy_level || 'task',
        project_id: projectId || data.project_id!,
        parent_id: data.parent_id,
        owner_id: data.owner_id,
        area: data.area,
        environment: data.environment,
        security_level: data.security_level || 'internal',
        story_points: data.story_points,
        estimated_hours: data.estimated_hours,
        start_date: data.start_date,
        due_date: data.due_date,
        blocked: data.blocked,
        blocking_reason: data.blocking_reason,
      })
      .select()
      .single();
    
    if (error) {
      toast({ 
        title: 'Error creating task', 
        description: error.message, 
        variant: 'destructive' 
      });
      throw error;
    }
    
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    
    toast({ title: 'Task created', description: `Created ${task.title}` });
    return task;
  };
  
  const updateTask = async (taskId: string, updates: Partial<TaskWithDetails>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();
    
    if (error) {
      toast({ 
        title: 'Error updating task', 
        description: error.message, 
        variant: 'destructive' 
      });
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    
    return data;
  };
  
  const deleteTask = async (taskId: string, soft = true) => {
    if (soft) {
      const { error } = await supabase
        .from('tasks')
        .update({ archived: true })
        .eq('id', taskId);
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    toast({ title: 'Task deleted' });
  };
  
  const convertToSubtask = async (taskId: string, parentId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        task_type: 'subtask',
        hierarchy_level: 'subtask',
        parent_id: parentId,
      })
      .eq('id', taskId);
    
    if (error) {
      toast({ 
        title: 'Error converting task', 
        description: error.message, 
        variant: 'destructive' 
      });
      throw error;
    }
    
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    toast({ title: 'Converted to subtask' });
  };
  
  const duplicateTask = async (taskId: string) => {
    // Fetch original task
    const { data: original, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Create copy
    const { data: copy, error: createError } = await supabase
      .from('tasks')
      .insert({
        ...original,
        id: undefined,
        title: `${original.title} (Copy)`,
        created_at: undefined,
        updated_at: undefined,
        ticket_number: undefined,
      })
      .select()
      .single();
    
    if (createError) throw createError;
    
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    toast({ title: 'Task duplicated' });
    return copy;
  };

  // Watchers operations
  const addWatcher = async (taskId: string, userId: string) => {
    const { error } = await supabase
      .from('task_watchers')
      .insert({ task_id: taskId, user_id: userId });
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  };

  const removeWatcher = async (taskId: string, userId: string) => {
    const { error } = await supabase
      .from('task_watchers')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId);
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  };

  // Components operations
  const addComponent = async (taskId: string, name: string) => {
    const { error } = await supabase
      .from('task_components')
      .insert({ task_id: taskId, name });
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  };

  const removeComponent = async (componentId: string, taskId: string) => {
    const { error } = await supabase
      .from('task_components')
      .delete()
      .eq('id', componentId);
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  };

  // Versions operations
  const addVersion = async (taskId: string, version: string, type: TaskVersionType) => {
    const { error } = await supabase
      .from('task_versions')
      .insert({ task_id: taskId, version, type });
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  };

  // Checklist operations
  const addChecklist = async (taskId: string, title: string) => {
    const { data, error } = await supabase
      .from('task_checklists')
      .insert({ task_id: taskId, title })
      .select()
      .single();
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    return data;
  };

  const updateChecklistItem = async (itemId: string, done: boolean, taskId: string) => {
    const { error } = await supabase
      .from('task_checklist_items')
      .update({ done })
      .eq('id', itemId);
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  };

  const addChecklistItem = async (checklistId: string, text: string, taskId: string) => {
    const { error } = await supabase
      .from('task_checklist_items')
      .insert({ checklist_id: checklistId, text, done: false });
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  };

  // Code references operations
  const addCodeReference = async (taskId: string, ref: Omit<TaskCodeReference, 'id'>) => {
    const { error } = await supabase
      .from('task_code_references')
      .insert({
        task_id: taskId,
        type: ref.type,
        url: ref.url,
        provider: ref.provider,
        status: ref.status,
        metadata: ref.metadata || {},
      });
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
  };

  return { 
    createTask, 
    updateTask, 
    deleteTask, 
    convertToSubtask, 
    duplicateTask,
    addWatcher,
    removeWatcher,
    addComponent,
    removeComponent,
    addVersion,
    addChecklist,
    updateChecklistItem,
    addChecklistItem,
    addCodeReference,
  };
}

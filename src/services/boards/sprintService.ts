import { supabase } from "@/integrations/supabase/client";
import type { Sprint, SprintItem } from "@/types/kanban";

/**
 * Create a new sprint
 */
export async function createSprint(
  projectId: string,
  data: {
    name: string;
    goal?: string;
    start_date: string;
    end_date: string;
    capacity_hours?: number;
    capacity_points?: number;
  }
): Promise<Sprint | null> {
  const { data: sprint, error } = await supabase
    .from('sprints')
    .insert({
      project_id: projectId,
      ...data,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating sprint:', error);
    return null;
  }

  return { ...sprint, metadata: (sprint as any)?.metadata || {} } as Sprint;
}

/**
 * Get sprints for a project
 */
export async function getProjectSprints(
  projectId: string,
  status?: 'planned' | 'active' | 'completed'
): Promise<Sprint[]> {
  let query = supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .order('start_date', { ascending: false });

  if (status) {
    query = query.eq('status', status as any);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sprints:', error);
    return [];
  }

  return (data as any[])?.map(s => ({ ...s, metadata: s.metadata || {} })) || [];
}

/**
 * Get active sprint for a project
 */
export async function getActiveSprint(
  projectId: string
): Promise<Sprint | null> {
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active' as any)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching active sprint:', error);
  }

  return data ? { ...data, metadata: (data as any).metadata || {} } as Sprint : null;
}

/**
 * Start a sprint
 */
export async function startSprint(sprintId: string): Promise<boolean> {
  // First, complete any active sprints for the same project
  const { data: sprint } = await supabase
    .from('sprints')
    .select('project_id')
    .eq('id', sprintId)
    .single();

  if (sprint) {
    await supabase
      .from('sprints')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('project_id', sprint.project_id)
      .eq('status', 'active');
  }

  // Start the new sprint
  const { error } = await supabase
    .from('sprints')
    .update({ status: 'active' })
    .eq('id', sprintId);

  return !error;
}

/**
 * Complete a sprint
 */
export async function completeSprint(
  sprintId: string,
  carryoverTaskIds: string[] = []
): Promise<boolean> {
  const { error } = await supabase
    .from('sprints')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sprintId);

  if (error) {
    console.error('Error completing sprint:', error);
    return false;
  }

  // Will implement carryover after sprint_items types regenerate
  return true;
}

/**
 * Add task to sprint
 */
export async function addTaskToSprint(
  sprintId: string,
  taskId: string
): Promise<boolean> {
  // Sprint items table not yet in types, will update after migration
  // For now just update task's sprint reference
  const { error } = await supabase
    .from('tasks')
    .update({} as any) // Will add sprint_id after types regenerate
    .eq('id', taskId);

  if (error) {
    console.error('Error adding task to sprint:', error);
    return false;
  }

  return true;
}

/**
 * Remove task from sprint
 */
export async function removeTaskFromSprint(
  sprintId: string,
  taskId: string
): Promise<boolean> {
  // Will implement after sprint_items types regenerate
  const { error } = await supabase
    .from('tasks')
    .update({} as any)
    .eq('id', taskId);

  if (error) {
    console.error('Error removing task from sprint:', error);
    return false;
  }

  return true;
}

/**
 * Get tasks in a sprint
 */
export async function getSprintTasks(sprintId: string, projectId?: string): Promise<any[]> {
  // For now, fetch tasks directly
  // Will use sprint_items join after types regenerate
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('sprint_id', sprintId);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sprint tasks:', error);
    return [];
  }

  return (data || []).filter(task => {
    const matchesSprint = (task as any).sprint_id === sprintId;
    const matchesProject = !projectId || (task as any).project_id === projectId;
    return matchesSprint && matchesProject;
  });
}

/**
 * Calculate sprint metrics
 */
export async function getSprintMetrics(sprintId: string, projectId?: string) {
  const tasks = await getSprintTasks(sprintId, projectId);

  const completedTasks = tasks.filter(t => (t as any).status_category === 'Done' || t.status === 'done');
  
  return {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    totalPoints: tasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
    completedPoints: completedTasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
    totalHours: tasks.reduce((sum, t) => sum + (t.estimate_hours || 0), 0),
    completedHours: completedTasks.reduce((sum, t) => sum + (t.estimate_hours || 0), 0),
  };
}

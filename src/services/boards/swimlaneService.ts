import { supabase } from "@/integrations/supabase/client";
import type { Swimlane, SwimlaneMode } from "@/types/kanban";

/**
 * Derive swimlanes dynamically based on mode and tasks
 */
export async function deriveSwimlanes(
  mode: SwimlaneMode,
  projectId: string,
  tasks: any[]
): Promise<Swimlane[]> {
  if (mode === 'none') {
    return [];
  }

  // For assignee mode, group by assignee
  if (mode === 'assignee') {
    return deriveAssigneeLanes(tasks, projectId);
  }

  // For priority mode, group by priority
  if (mode === 'priority') {
    return derivePriorityLanes(tasks, projectId);
  }

  // Fetch configured swimlanes from database
  const { data } = await supabase
    .from('swimlanes')
    .select('*')
    .eq('project_id', projectId)
    .order('position');

  return (data as any[])?.map(lane => ({
    ...lane,
    field: (lane as any).field || null,
    value: (lane as any).value || null,
    opql: (lane as any).opql || null,
    wip_limit: (lane as any).wip_limit || null,
    is_expedite: (lane as any).is_expedite || false,
    collapsed: (lane as any).collapsed || false,
    metadata: (lane as any).metadata || {},
  })) || [];
}

/**
 * Generate swimlanes by assignee
 */
function deriveAssigneeLanes(tasks: any[], projectId: string): Swimlane[] {
  const assigneeMap = new Map<string, any>();
  const unassignedLane: Swimlane = {
    id: 'unassigned',
    project_id: projectId,
    name: 'Unassigned',
    position: 999,
    field: 'assignee_id',
    value: null,
    is_expedite: false,
    collapsed: false,
    metadata: {},
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  tasks.forEach(task => {
    if (task.assignee_id) {
      if (!assigneeMap.has(task.assignee_id)) {
        assigneeMap.set(task.assignee_id, {
          id: `assignee-${task.assignee_id}`,
          project_id: projectId,
          name: task.assignee_name || 'Unknown User',
          position: assigneeMap.size,
          field: 'assignee_id',
          value: task.assignee_id,
          is_expedite: false,
          collapsed: false,
          metadata: {},
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  });

  const lanes = Array.from(assigneeMap.values());
  
  // Add unassigned lane if there are unassigned tasks
  const hasUnassigned = tasks.some(t => !t.assignee_id);
  if (hasUnassigned) {
    lanes.push(unassignedLane);
  }

  return lanes;
}

/**
 * Generate swimlanes by priority
 */
function derivePriorityLanes(tasks: any[], projectId: string): Swimlane[] {
  const priorities = ['urgent', 'high', 'medium', 'low'];
  const lanes: Swimlane[] = [];

  priorities.forEach((priority, index) => {
    const hasTasks = tasks.some(t => t.priority === priority);
    if (hasTasks) {
      lanes.push({
        id: `priority-${priority}`,
        project_id: projectId,
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        position: index,
        field: 'priority',
        value: priority,
        is_expedite: priority === 'urgent',
        collapsed: false,
        metadata: {},
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  });

  return lanes;
}

/**
 * Filter tasks for a specific swimlane
 */
export function filterTasksForLane(
  tasks: any[],
  lane: Swimlane,
  mode: SwimlaneMode
): any[] {
  if (mode === 'assignee') {
    if (lane.id === 'unassigned') {
      return tasks.filter(t => !t.assignee_id);
    }
    return tasks.filter(t => t.assignee_id === lane.value);
  }

  if (mode === 'priority') {
    return tasks.filter(t => t.priority === lane.value);
  }

  if (mode === 'query' && lane.opql) {
    // OPQL filtering would go here
    // For now, return all tasks
    return tasks;
  }

  return tasks;
}

/**
 * Get swimlane metrics (task count, points, blocked count)
 */
export function getSwimlaneMetrics(tasks: any[]) {
  return {
    cardCount: tasks.length,
    totalPoints: tasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
    blockedCount: tasks.filter(t => t.blocked).length,
    estimatedHours: tasks.reduce((sum, t) => sum + (t.estimate_hours || 0), 0),
  };
}

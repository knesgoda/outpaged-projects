import { supabase } from "@/integrations/supabase/client";
import type { SwimlaneMode } from "@/types/kanban";

export interface SwimlaneDefinition {
  id: string;
  name: string;
  field?: string;
  value?: any;
  color?: string;
  order: number;
  isDefault?: boolean;
  isExpedite?: boolean;
  count?: number;
  storyPoints?: number;
  blockedCount?: number;
}

export interface DerivedSwimlanesResult {
  lanes: SwimlaneDefinition[];
  mode: SwimlaneMode;
  field?: string;
}

export const swimlaneService = {
  /**
   * Derive swimlanes by assignee - one lane per unique assignee
   */
  deriveAssigneeLanes(tasks: any[]): SwimlaneDefinition[] {
    const assigneeMap = new Map<string, { name: string; count: number; points: number; blocked: number }>();
    
    // Collect unique assignees
    tasks.forEach(task => {
      const assigneeId = task.assignee_id || 'unassigned';
      const assigneeName = task.assignee_name || task.assignee?.full_name || 'Unassigned';
      
      if (!assigneeMap.has(assigneeId)) {
        assigneeMap.set(assigneeId, { name: assigneeName, count: 0, points: 0, blocked: 0 });
      }
      
      const lane = assigneeMap.get(assigneeId)!;
      lane.count++;
      lane.points += task.story_points || 0;
      if (task.is_blocked || task.status === 'blocked') lane.blocked++;
    });

    // Convert to lane definitions
    const lanes: SwimlaneDefinition[] = [];
    let order = 0;
    
    assigneeMap.forEach((data, assigneeId) => {
      lanes.push({
        id: assigneeId,
        name: data.name,
        field: 'assignee_id',
        value: assigneeId === 'unassigned' ? null : assigneeId,
        order: order++,
        count: data.count,
        storyPoints: data.points,
        blockedCount: data.blocked,
        isDefault: assigneeId === 'unassigned',
      });
    });

    return lanes.sort((a, b) => {
      if (a.isDefault) return 1; // Unassigned at bottom
      if (b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });
  },

  /**
   * Derive swimlanes by epic/parent - one lane per epic
   */
  deriveEpicLanes(tasks: any[]): SwimlaneDefinition[] {
    const epicMap = new Map<string, { name: string; count: number; points: number; blocked: number }>();
    
    tasks.forEach(task => {
      const epicId = task.epic_id || task.parent_id || 'no-epic';
      const epicName = task.epic_name || task.epic?.title || 'No Epic';
      
      if (!epicMap.has(epicId)) {
        epicMap.set(epicId, { name: epicName, count: 0, points: 0, blocked: 0 });
      }
      
      const lane = epicMap.get(epicId)!;
      lane.count++;
      lane.points += task.story_points || 0;
      if (task.is_blocked || task.status === 'blocked') lane.blocked++;
    });

    const lanes: SwimlaneDefinition[] = [];
    let order = 0;
    
    epicMap.forEach((data, epicId) => {
      lanes.push({
        id: epicId,
        name: data.name,
        field: 'epic_id',
        value: epicId === 'no-epic' ? null : epicId,
        order: order++,
        count: data.count,
        storyPoints: data.points,
        blockedCount: data.blocked,
        isDefault: epicId === 'no-epic',
      });
    });

    return lanes.sort((a, b) => {
      if (a.isDefault) return 1;
      if (b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });
  },

  /**
   * Derive swimlanes by priority
   */
  derivePriorityLanes(tasks: any[]): SwimlaneDefinition[] {
    const priorityOrder = ['critical', 'high', 'medium', 'low', 'none'];
    const priorityColors: Record<string, string> = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#3b82f6',
      none: '#6b7280',
    };
    
    const priorityMap = new Map<string, { count: number; points: number; blocked: number }>();
    
    tasks.forEach(task => {
      const priority = task.priority?.toLowerCase() || 'none';
      
      if (!priorityMap.has(priority)) {
        priorityMap.set(priority, { count: 0, points: 0, blocked: 0 });
      }
      
      const lane = priorityMap.get(priority)!;
      lane.count++;
      lane.points += task.story_points || 0;
      if (task.is_blocked || task.status === 'blocked') lane.blocked++;
    });

    const lanes: SwimlaneDefinition[] = [];
    
    priorityOrder.forEach((priority, index) => {
      const data = priorityMap.get(priority);
      if (data) {
        lanes.push({
          id: priority,
          name: priority.charAt(0).toUpperCase() + priority.slice(1),
          field: 'priority',
          value: priority === 'none' ? null : priority,
          color: priorityColors[priority],
          order: index,
          count: data.count,
          storyPoints: data.points,
          blockedCount: data.blocked,
        });
      }
    });

    return lanes;
  },

  /**
   * Derive swimlanes by project (for cross-project boards)
   */
  deriveProjectLanes(tasks: any[]): SwimlaneDefinition[] {
    const projectMap = new Map<string, { name: string; count: number; points: number; blocked: number; color?: string }>();
    
    tasks.forEach(task => {
      const projectId = task.project_id || 'no-project';
      const projectName = task.project_name || task.project?.name || 'No Project';
      const projectColor = task.project?.color;
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, { name: projectName, count: 0, points: 0, blocked: 0, color: projectColor });
      }
      
      const lane = projectMap.get(projectId)!;
      lane.count++;
      lane.points += task.story_points || 0;
      if (task.is_blocked || task.status === 'blocked') lane.blocked++;
    });

    const lanes: SwimlaneDefinition[] = [];
    let order = 0;
    
    projectMap.forEach((data, projectId) => {
      lanes.push({
        id: projectId,
        name: data.name,
        field: 'project_id',
        value: projectId === 'no-project' ? null : projectId,
        color: data.color,
        order: order++,
        count: data.count,
        storyPoints: data.points,
        blockedCount: data.blocked,
        isDefault: projectId === 'no-project',
      });
    });

    return lanes.sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Derive swimlanes by custom field
   */
  deriveCustomFieldLanes(tasks: any[], fieldName: string): SwimlaneDefinition[] {
    const fieldMap = new Map<string, { name: string; count: number; points: number; blocked: number }>();
    
    tasks.forEach(task => {
      const fieldValue = task[fieldName] || task.custom_fields?.[fieldName] || 'none';
      const displayValue = typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : String(fieldValue);
      
      if (!fieldMap.has(displayValue)) {
        fieldMap.set(displayValue, { name: displayValue, count: 0, points: 0, blocked: 0 });
      }
      
      const lane = fieldMap.get(displayValue)!;
      lane.count++;
      lane.points += task.story_points || 0;
      if (task.is_blocked || task.status === 'blocked') lane.blocked++;
    });

    const lanes: SwimlaneDefinition[] = [];
    let order = 0;
    
    fieldMap.forEach((data, value) => {
      lanes.push({
        id: `${fieldName}_${value}`,
        name: data.name,
        field: fieldName,
        value: value === 'none' ? null : value,
        order: order++,
        count: data.count,
        storyPoints: data.points,
        blockedCount: data.blocked,
        isDefault: value === 'none',
      });
    });

    return lanes.sort((a, b) => {
      if (a.isDefault) return 1;
      if (b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });
  },

  /**
   * Main function to derive swimlanes based on mode
   */
  deriveSwimlanesForMode(tasks: any[], mode: SwimlaneMode, customField?: string): DerivedSwimlanesResult {
    let lanes: SwimlaneDefinition[] = [];
    let field: string | undefined;

    switch (mode) {
      case 'assignee':
        lanes = this.deriveAssigneeLanes(tasks);
        field = 'assignee_id';
        break;
      case 'epic':
        lanes = this.deriveEpicLanes(tasks);
        field = 'epic_id';
        break;
      case 'priority':
        lanes = this.derivePriorityLanes(tasks);
        field = 'priority';
        break;
      case 'project':
        lanes = this.deriveProjectLanes(tasks);
        field = 'project_id';
        break;
      case 'custom_field':
        if (customField) {
          lanes = this.deriveCustomFieldLanes(tasks, customField);
          field = customField;
        }
        break;
      case 'none':
      default:
        // No swimlanes - return single default lane
        lanes = [{
          id: 'default',
          name: 'All Tasks',
          order: 0,
          isDefault: true,
          count: tasks.length,
          storyPoints: tasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
          blockedCount: tasks.filter(t => t.is_blocked || t.status === 'blocked').length,
        }];
        break;
    }

    return { lanes, mode, field };
  },

  /**
   * Get tasks for a specific swimlane
   */
  getTasksForLane(tasks: any[], lane: SwimlaneDefinition): any[] {
    if (lane.isDefault && lane.id === 'default') {
      return tasks;
    }

    if (!lane.field) {
      return tasks;
    }

    return tasks.filter(task => {
      const taskValue = task[lane.field!] || task.custom_fields?.[lane.field!];
      
      // Handle null/undefined values for default lanes
      if (lane.isDefault && lane.value === null) {
        return taskValue == null || taskValue === '' || taskValue === 'none';
      }
      
      // Direct value comparison
      return taskValue === lane.value;
    });
  },
};

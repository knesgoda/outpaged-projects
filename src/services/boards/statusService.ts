import { supabase } from "@/integrations/supabase/client";

export interface TaskStatus {
  id: string;
  project_id: string;
  name: string;
  key: string;
  description?: string;
  category: 'Todo' | 'InProgress' | 'Done';
  color: string;
  position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStatusInput {
  project_id: string;
  name: string;
  key: string;
  description?: string;
  category: 'Todo' | 'InProgress' | 'Done';
  color?: string;
  position?: number;
  is_default?: boolean;
}

export const statusService = {
  async getProjectStatuses(projectId: string): Promise<TaskStatus[]> {
    const { data, error } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []) as TaskStatus[];
  },

  async createStatus(input: CreateStatusInput): Promise<TaskStatus> {
    // Get max position for new status
    const { data: maxData } = await supabase
      .from('task_statuses')
      .select('position')
      .eq('project_id', input.project_id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = input.position ?? ((maxData?.position ?? -1) + 1);

    const { data, error } = await supabase
      .from('task_statuses')
      .insert({
        ...input,
        position,
        color: input.color || '#6b7280',
      })
      .select()
      .single();

    if (error) throw error;
    return data as TaskStatus;
  },

  async updateStatus(statusId: string, updates: Partial<TaskStatus>): Promise<TaskStatus> {
    const { data, error } = await supabase
      .from('task_statuses')
      .update(updates)
      .eq('id', statusId)
      .select()
      .single();

    if (error) throw error;
    return data as TaskStatus;
  },

  async deleteStatus(statusId: string): Promise<void> {
    const { error } = await supabase
      .from('task_statuses')
      .delete()
      .eq('id', statusId);

    if (error) throw error;
  },

  async getStatusesForColumn(columnId: string): Promise<TaskStatus[]> {
    const { data: column, error: columnError } = await supabase
      .from('kanban_columns')
      .select('status_keys, project_id')
      .eq('id', columnId)
      .single();

    if (columnError || !column) return [];

    const statusKeys = (column.status_keys as string[]) || [];
    if (statusKeys.length === 0) return [];

    const { data, error } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('project_id', column.project_id)
      .in('key', statusKeys)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []) as TaskStatus[];
  },

  async updateColumnStatusMapping(columnId: string, statusKeys: string[]): Promise<void> {
    const { error } = await supabase
      .from('kanban_columns')
      .update({ status_keys: statusKeys })
      .eq('id', columnId);

    if (error) throw error;
  },

  async reorderStatuses(projectId: string, statusIds: string[]): Promise<void> {
    // Update positions in order
    const updates = statusIds.map((id, index) => ({
      id,
      position: index,
    }));

    for (const update of updates) {
      await supabase
        .from('task_statuses')
        .update({ position: update.position })
        .eq('id', update.id);
    }
  },

  async getDefaultStatuses(projectId: string): Promise<TaskStatus[]> {
    const { data, error } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_default', true)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []) as TaskStatus[];
  },

  async initializeDefaultStatuses(projectId: string): Promise<void> {
    const defaultStatuses: Omit<CreateStatusInput, 'project_id'>[] = [
      { name: 'Backlog', key: 'backlog', category: 'Todo', color: '#6b7280', position: 0, is_default: true },
      { name: 'To Do', key: 'todo', category: 'Todo', color: '#3b82f6', position: 1, is_default: true },
      { name: 'In Progress', key: 'in_progress', category: 'InProgress', color: '#f59e0b', position: 2, is_default: true },
      { name: 'In Review', key: 'in_review', category: 'InProgress', color: '#8b5cf6', position: 3, is_default: true },
      { name: 'Done', key: 'done', category: 'Done', color: '#10b981', position: 4, is_default: true },
    ];

    for (const status of defaultStatuses) {
      await this.createStatus({ ...status, project_id: projectId });
    }
  },
};

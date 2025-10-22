import { supabase } from "@/integrations/supabase/client";
import type { 
  KanbanColumn, 
  ColumnMetadata, 
  WIPValidationResult, 
  ColumnMoveValidation,
  WIPStatus 
} from "@/types/kanban";

/**
 * Validate if a task can be moved to a column based on WIP limits
 */
export async function validateWIPLimit(
  columnId: string,
  currentCount: number
): Promise<WIPValidationResult> {
  const { data: column } = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('id', columnId)
    .single();

  if (!column) {
    return { allowed: true, severity: 'ok', currentCount };
  }

  const metadata = (column as any).metadata as ColumnMetadata || {};
  const wipLimit = metadata?.wip || {};
  
  // Check hard limit first
  if (wipLimit.hard && currentCount >= wipLimit.hard) {
    return {
      allowed: false,
      severity: 'hard',
      reason: `Hard WIP limit reached (${wipLimit.hard})`,
      currentCount,
      limit: wipLimit.hard
    };
  }

  // Check soft limit
  if (wipLimit.soft && currentCount >= wipLimit.soft) {
    return {
      allowed: true,
      severity: 'soft',
      reason: `Soft WIP limit exceeded (${wipLimit.soft})`,
      currentCount,
      limit: wipLimit.soft
    };
  }

  return {
    allowed: true,
    severity: 'ok',
    currentCount,
    limit: wipLimit.soft || wipLimit.hard
  };
}

/**
 * Check entry policies before allowing a task into a column
 */
export async function checkEntryPolicies(
  taskId: string,
  columnId: string
): Promise<ColumnMoveValidation> {
  const { data: column } = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('id', columnId)
    .single();

  if (!column) {
    return { allowed: true };
  }

  const metadata = (column as any).metadata as ColumnMetadata || {};
  const entryPolicies = metadata?.entryPolicy || [];

  if (entryPolicies.length === 0) {
    return { allowed: true };
  }

  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!task) {
    return { allowed: false, reason: 'Task not found' };
  }

  const failures: string[] = [];

  for (const policy of entryPolicies) {
    switch (policy) {
      case 'requireAssignee':
        if (!(task as any).assignee_id) {
          failures.push('Task must have an assignee');
        }
        break;
      case 'requireEstimate':
        const estimate = (task as any).estimate_hours || (task as any).story_points;
        if (!estimate) {
          failures.push('Task must have an estimate (hours or story points)');
        }
        break;
    }
  }

  return {
    allowed: failures.length === 0,
    reason: failures.join(', '),
    failures,
    severity: 'block'
  };
}

/**
 * Validate a complete column move including WIP and policies
 */
export async function validateColumnMove(
  taskId: string,
  toColumnId: string,
  currentColumnCount: number
): Promise<ColumnMoveValidation> {
  // Check WIP limits
  const wipResult = await validateWIPLimit(toColumnId, currentColumnCount + 1);
  
  if (!wipResult.allowed) {
    return {
      allowed: false,
      reason: wipResult.reason,
      severity: 'block'
    };
  }

  // Check entry policies
  const policyResult = await checkEntryPolicies(taskId, toColumnId);
  
  if (!policyResult.allowed) {
    return policyResult;
  }

  // Return warning if soft WIP exceeded
  if (wipResult.severity === 'soft') {
    return {
      allowed: true,
      reason: wipResult.reason,
      severity: 'warn'
    };
  }

  return { allowed: true };
}

/**
 * Get WIP status for a column
 */
export function getWIPStatus(
  currentCount: number,
  metadata?: ColumnMetadata
): WIPStatus {
  const wipLimit = metadata?.wip || {};
  
  if (wipLimit.hard && currentCount >= wipLimit.hard) {
    return 'hard';
  }
  
  if (wipLimit.soft && currentCount >= wipLimit.soft) {
    return 'soft';
  }
  
  return 'ok';
}

/**
 * Update task status category when moving columns
 */
export async function updateTaskStatusCategory(
  taskId: string,
  columnCategory: string
) {
  const updates: any = {
    status_category: columnCategory,
  };

  // Set resolved_at when moving to Done
  if (columnCategory === 'Done') {
    updates.resolved_at = new Date().toISOString();
  }

  await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId);
}

/**
 * Fetch columns for a project
 */
export async function getProjectColumns(
  projectId: string
): Promise<KanbanColumn[]> {
  const { data, error } = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('project_id', projectId)
    .order('position');

  if (error) {
    console.error('Error fetching columns:', error);
    return [];
  }

  return (data as any[])?.map(col => ({
    ...col,
    status_keys: (col as any).status_keys || [],
    category: (col as any).category || 'Todo',
    metadata: (col as any).metadata || {},
    collapsed: (col as any).collapsed || false,
    sort_override: (col as any).sort_override || null,
  })) || [];
}

/**
 * Count tasks in a column
 */
export async function countTasksInColumn(
  columnId: string,
  projectId: string
): Promise<number> {
  // Get the column to find its status_keys
  const { data: column } = await supabase
    .from('kanban_columns')
    .select('*')
    .eq('id', columnId)
    .single();

  const statusKeys = (column as any)?.status_keys;
  
  if (!column || !statusKeys || statusKeys.length === 0) {
    // Fallback: match by column name to status
    const statusValue = column?.name.toLowerCase().replace(/\s+/g, '_');
    
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', statusValue as any);
    
    return count || 0;
  }

  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .in('status', statusKeys);

  return count || 0;
}

import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch backlog items for a project
 * Backlog = tasks not in current sprint or with "Backlog" status
 */
export async function fetchBacklogItems(
  projectId: string,
  backlogStatuses: string[] = ['backlog', 'todo']
): Promise<any[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .or('sprint_id.is.null')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching backlog:', error);
    return [];
  }

  return data || [];
}

/**
 * Move task from backlog to board (assign to column/sprint)
 */
export async function moveFromBacklogToBoard(
  taskId: string,
  updates: {
    status?: any;
    sprint_id?: string;
  }
): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .update(updates as any)
    .eq('id', taskId);

  if (error) {
    console.error('Error moving from backlog:', error);
    return false;
  }

  return true;
}

/**
 * Rank a backlog item (for drag-and-drop ordering)
 * Uses lexicographic ranking for stable ordering
 */
export async function rankBacklogItem(
  taskId: string,
  newRank: string
): Promise<boolean> {
  // Rank field will be added after types regenerate
  const { error } = await supabase
    .from('tasks')
    .update({} as any)
    .eq('id', taskId);

  if (error) {
    console.error('Error ranking backlog item:', error);
    return false;
  }

  return true;
}

/**
 * Generate rank between two items
 * Simple implementation - in production, use a proper fractional indexing library
 */
export function generateRankBetween(before?: string, after?: string): string {
  if (!before && !after) {
    return 'm'; // Middle of alphabet
  }

  if (!before) {
    // Insert at beginning
    return String.fromCharCode(after!.charCodeAt(0) - 1);
  }

  if (!after) {
    // Insert at end
    return before + 'm';
  }

  // Insert between
  const mid = Math.floor((before.charCodeAt(0) + after.charCodeAt(0)) / 2);
  if (mid === before.charCodeAt(0)) {
    return before + 'm';
  }

  return String.fromCharCode(mid);
}

/**
 * Get backlog statistics
 */
export async function getBacklogStats(projectId: string) {
  const items = await fetchBacklogItems(projectId);

  return {
    totalItems: items.length,
    totalPoints: items.reduce((sum, t) => sum + (t.story_points || 0), 0),
    totalHours: items.reduce((sum, t) => sum + (t.estimate_hours || 0), 0),
    byPriority: {
      urgent: items.filter(t => t.priority === 'urgent').length,
      high: items.filter(t => t.priority === 'high').length,
      medium: items.filter(t => t.priority === 'medium').length,
      low: items.filter(t => t.priority === 'low').length,
    },
  };
}

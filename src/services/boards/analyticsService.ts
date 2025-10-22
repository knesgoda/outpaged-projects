import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format } from "date-fns";

export interface CFDDataPoint {
  date: string;
  [columnName: string]: number | string;
}

export interface ColumnDefinition {
  name: string;
  color: string;
}

/**
 * Fetch cumulative flow diagram data for a project
 * This creates a snapshot of task counts per column over time
 */
export async function fetchCFDData(
  projectId: string,
  days: number = 30
): Promise<{ data: CFDDataPoint[]; columns: ColumnDefinition[] }> {
  try {
    // Get project columns
    const { data: columns } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('project_id', projectId)
      .order('position');

    if (!columns || columns.length === 0) {
      return { data: [], columns: [] };
    }

    const columnDefs: ColumnDefinition[] = columns.map((col: any) => ({
      name: col.name,
      color: col.color || generateColorForColumn(col.name),
    }));

    // Generate date range
    const endDate = startOfDay(new Date());
    const dates: Date[] = [];
    for (let i = days - 1; i >= 0; i--) {
      dates.push(subDays(endDate, i));
    }

    // For each date, count tasks in each column
    // Note: This is simplified - in production you'd want historical snapshots
    const cfdData: CFDDataPoint[] = [];

    for (const date of dates) {
      const dataPoint: CFDDataPoint = {
        date: format(date, 'MMM dd'),
      };

      // Count tasks created before this date for each column
      for (const column of columns) {
        const statusKeys = (column as any).status_keys || [column.name.toLowerCase().replace(/\s+/g, '_')];
        
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .in('status', statusKeys)
          .lte('created_at', date.toISOString());

        dataPoint[column.name] = count || 0;
      }

      // Calculate cumulative totals
      let cumulative = 0;
      for (const column of columns) {
        const current = dataPoint[column.name] as number;
        cumulative += current;
        dataPoint[column.name] = cumulative;
      }

      cfdData.push(dataPoint);
    }

    return { data: cfdData, columns: columnDefs };
  } catch (error) {
    console.error('Error fetching CFD data:', error);
    return { data: [], columns: [] };
  }
}

/**
 * Get cycle time metrics for a project
 */
export async function fetchCycleTimeMetrics(projectId: string) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('created_at, resolved_at, status_category')
    .eq('project_id', projectId)
    .not('resolved_at', 'is', null)
    .order('resolved_at', { ascending: false })
    .limit(100);

  if (!tasks || tasks.length === 0) {
    return {
      average: 0,
      median: 0,
      p85: 0,
      p95: 0,
    };
  }

  const cycleTimes = tasks
    .map((task: any) => {
      const created = new Date(task.created_at);
      const resolved = new Date(task.resolved_at);
      const diffMs = resolved.getTime() - created.getTime();
      return diffMs / (1000 * 60 * 60 * 24); // Convert to days
    })
    .filter(ct => ct > 0);

  cycleTimes.sort((a, b) => a - b);

  const average = cycleTimes.reduce((sum, ct) => sum + ct, 0) / cycleTimes.length;
  const median = cycleTimes[Math.floor(cycleTimes.length / 2)] || 0;
  const p85 = cycleTimes[Math.floor(cycleTimes.length * 0.85)] || 0;
  const p95 = cycleTimes[Math.floor(cycleTimes.length * 0.95)] || 0;

  return {
    average: Math.round(average * 10) / 10,
    median: Math.round(median * 10) / 10,
    p85: Math.round(p85 * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
  };
}

/**
 * Get throughput metrics (tasks completed per week)
 */
export async function fetchThroughputMetrics(
  projectId: string,
  weeks: number = 4
) {
  const weeklyData = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = subDays(new Date(), (i + 1) * 7);
    const weekEnd = subDays(new Date(), i * 7);
    
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('resolved_at', weekStart.toISOString())
      .lt('resolved_at', weekEnd.toISOString());

    weeklyData.push({
      week: `Week ${weeks - i}`,
      count: count || 0,
    });
  }

  const average = weeklyData.reduce((sum, w) => sum + w.count, 0) / weeks;

  return {
    weekly: weeklyData,
    average: Math.round(average * 10) / 10,
  };
}

function generateColorForColumn(name: string): string {
  const colors = [
    'hsl(210, 70%, 60%)', // Blue
    'hsl(150, 70%, 55%)', // Green
    'hsl(45, 90%, 60%)',  // Yellow
    'hsl(30, 80%, 55%)',  // Orange
    'hsl(270, 60%, 65%)', // Purple
  ];
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

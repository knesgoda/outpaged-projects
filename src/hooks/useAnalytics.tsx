import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AnalyticsQuery {
  metric: string;
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange?: { start: string; end: string };
  grain?: 'day' | 'week' | 'month' | 'quarter';
}

export function useAnalytics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: metrics = [], isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['metrics-catalog'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('metrics_catalog' as any)
          .select('*')
          .eq('is_active', true);
        
        if (error) {
          console.warn('Metrics catalog table not available:', error.message);
          return [];
        }
        return data as any[];
      } catch (error) {
        console.warn('Failed to fetch metrics catalog:', error);
        return [];
      }
    },
    retry: false,
  });

  const { data: dashboards = [], isLoading: dashboardsLoading, error: dashboardsError } = useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('dashboards' as any)
          .select('*')
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.warn('Dashboards table not available:', error.message);
          return [];
        }
        return data as any[];
      } catch (error) {
        console.warn('Failed to fetch dashboards:', error);
        return [];
      }
    },
    retry: false,
  });

  const executeQuery = async (query: AnalyticsQuery) => {
    try {
      // Check cache first
      const cacheKey = JSON.stringify(query);
      try {
        const { data: cached } = await supabase
          .from('query_cache' as any)
          .select('result_data')
          .eq('query_hash', cacheKey)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cached) {
          return (cached as any).result_data;
        }
      } catch (cacheError) {
        console.warn('Query cache not available:', cacheError);
      }

      // Execute query based on metric type
      let result;
      
      switch (query.metric) {
        case 'throughput':
          result = await calculateThroughput(query);
          break;
        case 'velocity':
          result = await calculateVelocity(query);
          break;
        case 'lead_time':
          result = await calculateLeadTime(query);
          break;
        case 'cycle_time':
          result = await calculateCycleTime(query);
          break;
        case 'wip':
          result = await calculateWIP(query);
          break;
        default:
          throw new Error(`Metric ${query.metric} not implemented`);
      }

      // Cache result (silently fail if cache table doesn't exist)
      try {
        await supabase.from('query_cache' as any).insert({
          query_hash: cacheKey,
          query_config: query,
          result_data: result,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min TTL
        });
      } catch (cacheError) {
        console.warn('Failed to cache query result:', cacheError);
      }

      return result;
    } catch (error) {
      console.error('Query execution error:', error);
      return [];
    }
  };

  const saveDashboard = useMutation({
    mutationFn: async (dashboard: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('dashboards' as any)
        .insert({
          ...dashboard,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast({
        title: "Success",
        description: "Dashboard saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save dashboard",
        variant: "destructive",
      });
    },
  });

  return {
    metrics,
    metricsLoading,
    dashboards,
    dashboardsLoading,
    executeQuery,
    saveDashboard: saveDashboard.mutate,
  };
}

// Metric calculation functions
async function calculateThroughput(query: AnalyticsQuery) {
  try {
    const { data, error } = await supabase
      .from('mv_throughput_daily' as any)
      .select('*')
      .order('date_key', { ascending: true });

    if (error) throw error;

    return (data as any[])?.map((d: any) => ({
      name: d.date_key,
      value: d.items_completed,
    })) || [];
  } catch (error) {
    console.warn('Throughput view not available:', error);
    return [];
  }
}

async function calculateVelocity(query: AnalyticsQuery) {
  try {
    const { data, error } = await supabase
      .from('mv_velocity_weekly' as any)
      .select('*')
      .order('week_start', { ascending: true });

    if (error) throw error;

    return (data as any[])?.map((d: any) => ({
      name: d.week_start,
      value: d.points_completed,
    })) || [];
  } catch (error) {
    console.warn('Velocity view not available:', error);
    return [];
  }
}

async function calculateLeadTime(query: AnalyticsQuery) {
  try {
    const { data, error } = await supabase
      .from('fact_transitions' as any)
      .select('*')
      .eq('to_category', 'done')
      .order('occurred_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    // Calculate lead time from task creation to done
    const leadTimes = (data as any[])?.map((t: any) => ({
      value: Math.round(t.duration_in_from_seconds / 86400), // Convert to days
    })) || [];

    return leadTimes;
  } catch (error) {
    console.warn('Transitions fact table not available:', error);
    return [];
  }
}

async function calculateCycleTime(query: AnalyticsQuery) {
  try {
    const { data, error } = await supabase
      .from('fact_transitions' as any)
      .select('*')
      .eq('to_category', 'done')
      .order('occurred_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    const cycleTimes = (data as any[])?.map((t: any) => ({
      value: Math.round(t.duration_in_from_seconds / 86400),
    })) || [];

    return cycleTimes;
  } catch (error) {
    console.warn('Transitions fact table not available:', error);
    return [];
  }
}

async function calculateWIP(query: AnalyticsQuery) {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('status, project_id')
      .eq('status', 'in_progress');

    if (error) throw error;

    return [{
      name: 'Current WIP',
      value: tasks?.length || 0,
    }];
  } catch (error) {
    console.warn('Failed to calculate WIP:', error);
    return [{ name: 'Current WIP', value: 0 }];
  }
}

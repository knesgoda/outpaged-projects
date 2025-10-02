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

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['metrics-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metrics_catalog' as any)
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: dashboards, isLoading: dashboardsLoading } = useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboards' as any)
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  const executeQuery = async (query: AnalyticsQuery) => {
    try {
      // Check cache first
      const cacheKey = JSON.stringify(query);
      const { data: cached } = await supabase
        .from('query_cache' as any)
        .select('result_data')
        .eq('query_hash', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        return (cached as any).result_data;
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

      // Cache result
      await supabase.from('query_cache' as any).insert({
        query_hash: cacheKey,
        query_config: query,
        result_data: result,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min TTL
      });

      return result;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
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
  const { data } = await supabase
    .from('mv_throughput_daily' as any)
    .select('*')
    .order('date_key', { ascending: true });

  return (data as any[])?.map((d: any) => ({
    name: d.date_key,
    value: d.items_completed,
  })) || [];
}

async function calculateVelocity(query: AnalyticsQuery) {
  const { data } = await supabase
    .from('mv_velocity_weekly' as any)
    .select('*')
    .order('week_start', { ascending: true });

  return (data as any[])?.map((d: any) => ({
    name: d.week_start,
    value: d.points_completed,
  })) || [];
}

async function calculateLeadTime(query: AnalyticsQuery) {
  const { data } = await supabase
    .from('fact_transitions' as any)
    .select('*')
    .eq('to_category', 'done')
    .order('occurred_at', { ascending: true })
    .limit(100);

  // Calculate lead time from task creation to done
  const leadTimes = (data as any[])?.map((t: any) => ({
    value: Math.round(t.duration_in_from_seconds / 86400), // Convert to days
  })) || [];

  return leadTimes;
}

async function calculateCycleTime(query: AnalyticsQuery) {
  const { data } = await supabase
    .from('fact_transitions' as any)
    .select('*')
    .eq('to_category', 'done')
    .order('occurred_at', { ascending: true })
    .limit(100);

  const cycleTimes = (data as any[])?.map((t: any) => ({
    value: Math.round(t.duration_in_from_seconds / 86400),
  })) || [];

  return cycleTimes;
}

async function calculateWIP(query: AnalyticsQuery) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('status, project_id')
    .eq('status', 'in_progress');

  return [{
    name: 'Current WIP',
    value: tasks?.length || 0,
  }];
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Zap, Target, AlertTriangle, Clock } from "lucide-react";

interface DORAMetricsProps {
  projectId?: string;
}

export function DORAMetrics({ projectId }: DORAMetricsProps) {
  const { data: doraData, isLoading } = useQuery({
    queryKey: ['dora-metrics', projectId],
    queryFn: async () => {
      let query = supabase
        .from('mv_dora_metrics' as any)
        .select('*')
        .order('week_start', { ascending: false })
        .limit(12);
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).reverse();
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading DORA metrics...</div>;
  }

  const latestWeek = doraData?.[doraData.length - 1] as any || {};
  const previousWeek = doraData?.[doraData.length - 2] as any || {};

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const metrics = [
    {
      title: 'Deployment Frequency',
      value: latestWeek.deployments_per_day?.toFixed(2) || '0',
      unit: 'per day',
      change: calculateChange(latestWeek.deployments_per_day || 0, previousWeek.deployments_per_day || 0),
      icon: Zap,
      color: 'hsl(var(--chart-1))',
      target: 'Elite: >1/day',
    },
    {
      title: 'Lead Time for Changes',
      value: latestWeek.lead_time_hours_p50?.toFixed(1) || '0',
      unit: 'hours (p50)',
      change: calculateChange(previousWeek.lead_time_hours_p50 || 0, latestWeek.lead_time_hours_p50 || 0), // Inverse - lower is better
      icon: Clock,
      color: 'hsl(var(--chart-2))',
      target: 'Elite: <1 hour',
    },
    {
      title: 'Change Failure Rate',
      value: latestWeek.change_failure_rate_pct?.toFixed(1) || '0',
      unit: '%',
      change: calculateChange(previousWeek.change_failure_rate_pct || 0, latestWeek.change_failure_rate_pct || 0), // Inverse
      icon: AlertTriangle,
      color: 'hsl(var(--chart-3))',
      target: 'Elite: <15%',
    },
    {
      title: 'Time to Restore',
      value: latestWeek.mttr_hours_p50?.toFixed(1) || '0',
      unit: 'hours (p50)',
      change: calculateChange(previousWeek.mttr_hours_p50 || 0, latestWeek.mttr_hours_p50 || 0), // Inverse
      icon: Target,
      color: 'hsl(var(--chart-4))',
      target: 'Elite: <1 hour',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">DORA Metrics</h2>
        <p className="text-sm text-muted-foreground">
          DevOps Research & Assessment key performance indicators
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.change > 0;
          const changeColor = metric.title.includes('Lead') || metric.title.includes('Failure') || metric.title.includes('Restore')
            ? (isPositive ? 'text-red-600' : 'text-green-600')
            : (isPositive ? 'text-green-600' : 'text-red-600');

          return (
            <Card key={metric.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {metric.change !== 0 && (
                    <div className={`flex items-center gap-1 text-xs ${changeColor}`}>
                      {(metric.title.includes('Lead') || metric.title.includes('Failure') || metric.title.includes('Restore')) ? (
                        isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                      ) : (
                        isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(metric.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" style={{ color: metric.color }}>
                  {metric.value}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {metric.unit}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{metric.target}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Deployment Frequency Trend</CardTitle>
            <CardDescription>Deployments per day over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={doraData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week_start" 
                  className="text-xs"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: any) => value.toFixed(2)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="deployments_per_day" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  name="Deployments/day"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Failure Rate</CardTitle>
            <CardDescription>Failed deployments percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={doraData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="week_start" 
                  className="text-xs"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: any) => `${value.toFixed(1)}%`}
                />
                <Legend />
                <Bar 
                  dataKey="change_failure_rate_pct" 
                  fill="hsl(var(--chart-3))" 
                  name="Failure Rate %"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

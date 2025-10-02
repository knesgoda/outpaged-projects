import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { TrendingUp, AlertTriangle } from "lucide-react";

interface ControlChartProps {
  projectId?: string;
  metric?: string;
}

export function ControlChart({ projectId, metric = 'cycle_time' }: ControlChartProps) {
  // Mock data - would come from useAnalytics hook
  const data = [
    { date: '2025-01-01', value: 3.2, ucl: 8.5, lcl: 0.5, mean: 4.5 },
    { date: '2025-01-02', value: 4.1, ucl: 8.5, lcl: 0.5, mean: 4.5 },
    { date: '2025-01-03', value: 2.8, ucl: 8.5, lcl: 0.5, mean: 4.5 },
    { date: '2025-01-04', value: 5.2, ucl: 8.5, lcl: 0.5, mean: 4.5 },
    { date: '2025-01-05', value: 9.1, ucl: 8.5, lcl: 0.5, mean: 4.5 }, // Out of control
    { date: '2025-01-06', value: 4.7, ucl: 8.5, lcl: 0.5, mean: 4.5 },
    { date: '2025-01-07', value: 3.9, ucl: 8.5, lcl: 0.5, mean: 4.5 },
    { date: '2025-01-08', value: 4.3, ucl: 8.5, lcl: 0.5, mean: 4.5 },
    { date: '2025-01-09', value: 5.8, ucl: 8.5, lcl: 0.5, mean: 4.5 },
    { date: '2025-01-10', value: 4.1, ucl: 8.5, lcl: 0.5, mean: 4.5 },
  ];

  const outOfControlPoints = data.filter(d => d.value > d.ucl || d.value < d.lcl).length;
  const isStable = outOfControlPoints === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Control Chart - {metric.replace('_', ' ').toUpperCase()}
              {!isStable && <AlertTriangle className="h-5 w-5 text-destructive" />}
            </CardTitle>
            <CardDescription>
              Statistical process control with UCL/LCL bounds
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{data[data.length - 1].value.toFixed(1)}d</div>
            <div className={`text-xs ${isStable ? 'text-green-600' : 'text-destructive'}`}>
              {isStable ? 'Process stable' : `${outOfControlPoints} outliers`}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis className="text-xs" label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              formatter={(value: any) => [`${value.toFixed(1)} days`, '']}
            />
            <Legend />
            
            {/* Control limits */}
            <ReferenceLine y={data[0].ucl} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="UCL" />
            <ReferenceLine y={data[0].mean} stroke="hsl(var(--primary))" strokeDasharray="3 3" label="Mean" />
            <ReferenceLine y={data[0].lcl} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="LCL" />
            
            {/* Data line */}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const isOutOfControl = payload.value > payload.ucl || payload.value < payload.lcl;
                return (
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={isOutOfControl ? 6 : 4} 
                    fill={isOutOfControl ? 'hsl(var(--destructive))' : 'hsl(var(--chart-1))'} 
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Mean (μ)</div>
            <div className="text-xl font-semibold">{data[0].mean.toFixed(1)}d</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Upper Control Limit</div>
            <div className="text-xl font-semibold">{data[0].ucl.toFixed(1)}d</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Lower Control Limit</div>
            <div className="text-xl font-semibold">{data[0].lcl.toFixed(1)}d</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

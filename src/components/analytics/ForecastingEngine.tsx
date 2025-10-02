import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ForecastingEngineProps {
  projectId?: string;
}

export function ForecastingEngine({ projectId }: ForecastingEngineProps) {
  const [metric, setMetric] = useState('throughput');
  const [horizon, setHorizon] = useState('30');

  // Mock historical + forecast data
  const data = [
    { date: '2024-12-01', actual: 42, forecast: null, lower: null, upper: null },
    { date: '2024-12-08', actual: 45, forecast: null, lower: null, upper: null },
    { date: '2024-12-15', actual: 48, forecast: null, lower: null, upper: null },
    { date: '2024-12-22', actual: 44, forecast: null, lower: null, upper: null },
    { date: '2024-12-29', actual: 47, forecast: null, lower: null, upper: null },
    { date: '2025-01-05', actual: 50, forecast: 50, lower: 45, upper: 55 },
    { date: '2025-01-12', actual: null, forecast: 52, lower: 46, upper: 58 },
    { date: '2025-01-19', actual: null, forecast: 54, lower: 47, upper: 61 },
    { date: '2025-01-26', actual: null, forecast: 55, lower: 48, upper: 62 },
    { date: '2025-02-02', actual: null, forecast: 56, lower: 49, upper: 63 },
  ];

  const forecastAccuracy = 92.5;
  const trend = 'increasing';
  const confidenceInterval = 95;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Forecasting Engine</h2>
          <p className="text-sm text-muted-foreground">
            Predict future metric values using Holt-Winters method
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="throughput">Throughput</SelectItem>
              <SelectItem value="velocity">Velocity</SelectItem>
              <SelectItem value="cycle_time">Cycle Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={horizon} onValueChange={setHorizon}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14">2 weeks</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          <strong>Forecast Quality:</strong> {forecastAccuracy}% accuracy • 
          Trend: {trend} • Confidence: {confidenceInterval}% interval
        </AlertDescription>
      </Alert>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Visualization</CardTitle>
          <CardDescription>
            Historical actuals with projected forecast and confidence bands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis className="text-xs" label={{ value: 'Items', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: any) => value?.toFixed(0)}
              />
              <Legend />
              
              {/* Confidence interval */}
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.1}
                name="Upper Bound"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.1}
                name="Lower Bound"
              />
              
              {/* Actual line */}
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                name="Actual"
              />
              
              {/* Forecast line */}
              <Line 
                type="monotone" 
                dataKey="forecast" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                name="Forecast"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Forecast Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Model Type</CardDescription>
            <CardTitle className="text-lg">Holt-Winters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Triple exponential smoothing with seasonal adjustment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Training Period</CardDescription>
            <CardTitle className="text-lg">90 days</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Last trained: 2 hours ago
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accuracy Metrics</CardDescription>
            <CardTitle className="text-lg">{forecastAccuracy}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">MAPE: 7.5%</Badge>
              <Badge variant="outline" className="text-xs">R²: 0.89</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Details</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted">
              <tr>
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-right py-2 px-3">Forecast</th>
                <th className="text-right py-2 px-3">Lower ({confidenceInterval}%)</th>
                <th className="text-right py-2 px-3">Upper ({confidenceInterval}%)</th>
                <th className="text-right py-2 px-3">Range</th>
              </tr>
            </thead>
            <tbody>
              {data.filter(d => d.forecast !== null).map((row, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3">
                    {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="text-right py-2 px-3 font-medium">
                    {row.forecast?.toFixed(0)}
                  </td>
                  <td className="text-right py-2 px-3 text-muted-foreground">
                    {row.lower?.toFixed(0)}
                  </td>
                  <td className="text-right py-2 px-3 text-muted-foreground">
                    {row.upper?.toFixed(0)}
                  </td>
                  <td className="text-right py-2 px-3">
                    <Badge variant="outline">
                      ±{((row.upper! - row.lower!) / 2).toFixed(0)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

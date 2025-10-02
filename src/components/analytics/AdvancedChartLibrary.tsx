import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ChartProps {
  type: 'kpi' | 'line' | 'bar' | 'table' | 'pie' | 'gauge' | 'heatmap' | 'flow';
  data: any[];
  config?: any;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function AdvancedChartLibrary({ type, data, config = {} }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No data available
      </div>
    );
  }

  switch (type) {
    case 'kpi':
      return <KPICard data={data[0]} config={config} />;
    
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={config.xKey || "name"} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={config.yKey || "value"} 
              stroke={COLORS[0]} 
              strokeWidth={2}
              dot={{ fill: COLORS[0] }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={config.xKey || "name"} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
            <Legend />
            <Bar dataKey={config.yKey || "value"} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    
    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={config.valueKey || "value"}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    
    case 'gauge':
      return <GaugeWidget data={data[0]} config={config} />;
    
    case 'table':
      return (
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                {Object.keys(data[0] || {}).map(key => (
                  <th key={key} className="px-4 py-2 text-left font-medium">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b">
                  {Object.values(row).map((value: any, j) => (
                    <td key={j} className="px-4 py-2">{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    
    default:
      return <div className="text-muted-foreground">Chart type not supported yet</div>;
  }
}

function KPICard({ data, config }: { data: any; config: any }) {
  const value = data?.value || 0;
  const previousValue = data?.previousValue || 0;
  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Activity className="h-4 w-4 text-muted-foreground" />
        {change !== 0 && (
          <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      {data?.target && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Target: {data.target}</span>
            <span>{((value / data.target) * 100).toFixed(0)}%</span>
          </div>
          <Progress value={(value / data.target) * 100} />
        </div>
      )}
    </div>
  );
}

function GaugeWidget({ data, config }: { data: any; config: any }) {
  const value = data?.value || 0;
  const max = data?.max || 100;
  const percentage = (value / max) * 100;
  
  const getColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={`text-5xl font-bold ${getColor(percentage)}`}>
        {value.toFixed(0)}
      </div>
      <Progress value={percentage} className="w-full" />
      <div className="text-sm text-muted-foreground">
        {percentage.toFixed(0)}% of {max}
      </div>
    </div>
  );
}

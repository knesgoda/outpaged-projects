import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface CFDDataPoint {
  date: string;
  [columnName: string]: number | string;
}

interface CumulativeFlowDiagramProps {
  data: CFDDataPoint[];
  columns: Array<{ name: string; color: string }>;
}

export function CumulativeFlowDiagram({ data, columns }: CumulativeFlowDiagramProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    return data;
  }, [data]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Flow Diagram</CardTitle>
          <CardDescription>
            Track work progression across columns over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available yet. Start tracking tasks to see flow metrics.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumulative Flow Diagram</CardTitle>
        <CardDescription>
          Cumulative task count by column status over the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <defs>
              {columns.map((col) => (
                <linearGradient key={col.name} id={`color-${col.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={col.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={col.color} stopOpacity={0.3} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            {columns.map((col) => (
              <Area
                key={col.name}
                type="monotone"
                dataKey={col.name}
                stackId="1"
                stroke={col.color}
                fill={`url(#color-${col.name})`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

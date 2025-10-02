import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PeriodComparisonProps {
  projectId?: string;
}

export function PeriodComparison({ projectId }: PeriodComparisonProps) {
  const [comparisonType, setComparisonType] = useState('yoy'); // yoy, qoq, sprint
  const [metric, setMetric] = useState('throughput');

  // Mock comparison data
  const data = {
    yoy: [
      { period: 'Jan', current: 45, previous: 38, target: 50 },
      { period: 'Feb', current: 52, previous: 42, target: 50 },
      { period: 'Mar', current: 48, previous: 45, target: 50 },
      { period: 'Apr', current: 55, previous: 40, target: 50 },
    ],
    qoq: [
      { period: 'Q1', current: 145, previous: 125, target: 150 },
      { period: 'Q2', current: 162, previous: 138, target: 150 },
      { period: 'Q3', current: 158, previous: 142, target: 150 },
      { period: 'Q4', current: 170, previous: 150, target: 150 },
    ],
    sprint: [
      { period: 'Sprint 1', current: 23, previous: 19, target: 25 },
      { period: 'Sprint 2', current: 28, previous: 21, target: 25 },
      { period: 'Sprint 3', current: 25, previous: 23, target: 25 },
      { period: 'Sprint 4', current: 30, previous: 22, target: 25 },
    ],
  };

  const currentData = data[comparisonType as keyof typeof data];
  const currentTotal = currentData.reduce((sum, d) => sum + d.current, 0);
  const previousTotal = currentData.reduce((sum, d) => sum + d.previous, 0);
  const change = ((currentTotal - previousTotal) / previousTotal) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Period Comparison</h2>
          <p className="text-sm text-muted-foreground">
            Compare metrics across different time periods
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
              <SelectItem value="lead_time">Lead Time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={comparisonType} onValueChange={setComparisonType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yoy">Year over Year</SelectItem>
              <SelectItem value="qoq">Quarter over Quarter</SelectItem>
              <SelectItem value="sprint">Sprint to Sprint</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Period</CardDescription>
            <CardTitle className="text-3xl">{currentTotal}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {comparisonType === 'yoy' ? 'This Year' : comparisonType === 'qoq' ? 'This Quarter' : 'Current Sprints'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Previous Period</CardDescription>
            <CardTitle className="text-3xl">{previousTotal}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {comparisonType === 'yoy' ? 'Last Year' : comparisonType === 'qoq' ? 'Last Quarter' : 'Previous Sprints'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Change</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <span className={`text-3xl ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              {change >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {change >= 0 ? 'Improvement' : 'Decline'} vs previous period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Period Comparison - Line Chart</CardTitle>
            <CardDescription>Current vs Previous with target baseline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  name="Current Period"
                />
                <Line 
                  type="monotone" 
                  dataKey="previous" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Previous Period"
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  name="Target"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Side-by-Side Comparison</CardTitle>
            <CardDescription>Bar chart showing period differences</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={currentData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="current" fill="hsl(var(--chart-1))" name="Current" radius={[4, 4, 0, 0]} />
                <Bar dataKey="previous" fill="hsl(var(--chart-2))" name="Previous" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 px-3">Period</th>
                <th className="text-right py-2 px-3">Current</th>
                <th className="text-right py-2 px-3">Previous</th>
                <th className="text-right py-2 px-3">Difference</th>
                <th className="text-right py-2 px-3">% Change</th>
                <th className="text-right py-2 px-3">vs Target</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, i) => {
                const diff = row.current - row.previous;
                const pctChange = ((diff / row.previous) * 100).toFixed(1);
                const vsTarget = row.current - row.target;
                
                return (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{row.period}</td>
                    <td className="text-right py-2 px-3">{row.current}</td>
                    <td className="text-right py-2 px-3 text-muted-foreground">{row.previous}</td>
                    <td className={`text-right py-2 px-3 font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {diff >= 0 ? '+' : ''}{diff}
                    </td>
                    <td className={`text-right py-2 px-3 ${parseFloat(pctChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseFloat(pctChange) >= 0 ? '+' : ''}{pctChange}%
                    </td>
                    <td className="text-right py-2 px-3">
                      <Badge variant={vsTarget >= 0 ? 'default' : 'destructive'}>
                        {vsTarget >= 0 ? '+' : ''}{vsTarget}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

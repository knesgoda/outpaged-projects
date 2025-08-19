import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface VelocityData {
  period: string;
  planned: number;
  completed: number;
  velocity: number;
  trend: number;
}

interface TaskVelocityChartProps {
  projectId?: string;
}

export function TaskVelocityChart({ projectId }: TaskVelocityChartProps) {
  const [velocityData, setVelocityData] = useState<VelocityData[]>([]);
  const [timeRange, setTimeRange] = useState('3months');
  const [viewType, setViewType] = useState<'velocity' | 'comparison'>('velocity');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVelocityData();
  }, [projectId, timeRange]);

  const loadVelocityData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the database
      // For now, we'll use mock data
      const mockData: VelocityData[] = [
        { period: 'Sprint 1', planned: 50, completed: 45, velocity: 45, trend: 0 },
        { period: 'Sprint 2', planned: 55, completed: 52, velocity: 52, trend: 7 },
        { period: 'Sprint 3', planned: 48, completed: 48, velocity: 48, trend: -4 },
        { period: 'Sprint 4', planned: 60, completed: 58, velocity: 58, trend: 10 },
        { period: 'Sprint 5', planned: 55, completed: 62, velocity: 62, trend: 4 },
        { period: 'Sprint 6', planned: 65, completed: 59, velocity: 59, trend: -3 },
        { period: 'Sprint 7', planned: 70, completed: 67, velocity: 67, trend: 8 },
        { period: 'Sprint 8', planned: 65, completed: 71, velocity: 71, trend: 4 }
      ];
      
      setVelocityData(mockData);
    } catch (error) {
      console.error('Error loading velocity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const averageVelocity = velocityData.reduce((sum, item) => sum + item.velocity, 0) / velocityData.length;
  const lastSprint = velocityData[velocityData.length - 1];
  const previousSprint = velocityData[velocityData.length - 2];
  const velocityTrend = lastSprint && previousSprint ? 
    ((lastSprint.velocity - previousSprint.velocity) / previousSprint.velocity) * 100 : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'planned' ? 'Planned' : 
               entry.dataKey === 'completed' ? 'Completed' : 'Velocity'}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="animate-pulse">Loading velocity data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Velocity Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Track story points and task completion over time
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="velocity">Velocity Trend</SelectItem>
              <SelectItem value="comparison">Planned vs Actual</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Velocity</p>
                <p className="text-2xl font-bold">{Math.round(averageVelocity)}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Sprint</p>
                <p className="text-2xl font-bold">{lastSprint?.velocity || 0}</p>
              </div>
              {velocityTrend > 0 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Velocity Trend</p>
                <p className={`text-2xl font-bold ${velocityTrend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {velocityTrend > 0 ? '+' : ''}{velocityTrend.toFixed(1)}%
                </p>
              </div>
              {velocityTrend > 0 ? (
                <TrendingUp className="w-8 h-8 text-green-500" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {viewType === 'velocity' ? 'Velocity Trend' : 'Planned vs Completed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {viewType === 'velocity' ? (
                <LineChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="velocity" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="planned" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                  />
                </LineChart>
              ) : (
                <BarChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="planned" fill="hsl(var(--muted))" name="Planned" />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Velocity Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Highest Velocity:</span>
              <span className="font-medium">
                {Math.max(...velocityData.map(d => d.velocity))} points
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Lowest Velocity:</span>
              <span className="font-medium">
                {Math.min(...velocityData.map(d => d.velocity))} points
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Velocity Variance:</span>
              <span className="font-medium">
                {(Math.max(...velocityData.map(d => d.velocity)) - 
                  Math.min(...velocityData.map(d => d.velocity)))} points
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Predictability:</span>
              <span className="font-medium">
                {velocityData.filter(d => Math.abs(d.completed - d.planned) <= 5).length / velocityData.length * 100}% accurate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {velocityTrend > 10 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Great momentum! Consider taking on more ambitious goals.
                </p>
              </div>
            )}
            {velocityTrend < -10 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Velocity declining. Review team capacity and sprint planning.
                </p>
              </div>
            )}
            {Math.abs(velocityTrend) <= 10 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Stable velocity. Focus on maintaining consistency.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
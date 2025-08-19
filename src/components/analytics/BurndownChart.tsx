import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

interface BurndownData {
  day: string;
  remaining: number;
  ideal: number;
  completed: number;
  date: Date;
}

interface BurndownChartProps {
  projectId?: string;
}

export function BurndownChart({ projectId }: BurndownChartProps) {
  const [burndownData, setBurndownData] = useState<BurndownData[]>([]);
  const [selectedSprint, setSelectedSprint] = useState('current');
  const [chartType, setChartType] = useState<'burndown' | 'burnup'>('burndown');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBurndownData();
  }, [projectId, selectedSprint, chartType]);

  const loadBurndownData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the database
      // For now, we'll generate mock data
      const sprintStart = new Date();
      const sprintEnd = addDays(sprintStart, 14); // 2 week sprint
      const totalPoints = 50;
      const days = differenceInDays(sprintEnd, sprintStart) + 1;
      
      const mockData: BurndownData[] = [];
      for (let i = 0; i < days; i++) {
        const currentDate = addDays(sprintStart, i);
        const idealRemaining = Math.max(0, totalPoints - (totalPoints / (days - 1)) * i);
        
        // Simulate actual progress with some variance
        let actualCompleted = 0;
        if (i > 0) {
          const previousCompleted = mockData[i - 1]?.completed || 0;
          const dailyProgress = Math.random() * 6; // 0-6 points per day
          actualCompleted = Math.min(totalPoints, previousCompleted + dailyProgress);
        }
        
        const remaining = Math.max(0, totalPoints - actualCompleted);
        
        mockData.push({
          day: `Day ${i + 1}`,
          remaining: chartType === 'burndown' ? remaining : actualCompleted,
          ideal: chartType === 'burndown' ? idealRemaining : totalPoints - idealRemaining,
          completed: actualCompleted,
          date: currentDate
        });
      }
      
      setBurndownData(mockData);
    } catch (error) {
      console.error('Error loading burndown data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sprintProgress = burndownData.length > 0 ? 
    (burndownData[burndownData.length - 1]?.completed / 50) * 100 : 0;
  
  const remainingPoints = burndownData.length > 0 ? 
    50 - burndownData[burndownData.length - 1]?.completed : 0;
  
  const isOnTrack = burndownData.length > 1 ? 
    burndownData[burndownData.length - 1]?.remaining <= 
    burndownData[burndownData.length - 1]?.ideal : true;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-md">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">Date: {format(data?.date, 'MMM dd, yyyy')}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'ideal' ? 'Ideal' : 
               chartType === 'burndown' ? 'Remaining' : 'Completed'}: {entry.value} points
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="animate-pulse">Loading burndown data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sprint Progress</h3>
          <p className="text-sm text-muted-foreground">
            Track sprint {chartType === 'burndown' ? 'burndown' : 'burnup'} and progress
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="burndown">Burndown</SelectItem>
              <SelectItem value="burnup">Burnup</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedSprint} onValueChange={setSelectedSprint}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Sprint</SelectItem>
              <SelectItem value="sprint-1">Sprint 1</SelectItem>
              <SelectItem value="sprint-2">Sprint 2</SelectItem>
              <SelectItem value="sprint-3">Sprint 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sprint Progress</p>
                <p className="text-2xl font-bold">{sprintProgress.toFixed(1)}%</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remaining Work</p>
                <p className="text-2xl font-bold">{remainingPoints.toFixed(0)} pts</p>
              </div>
              <TrendingDown className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`text-lg font-bold ${isOnTrack ? 'text-green-500' : 'text-red-500'}`}>
                  {isOnTrack ? 'On Track' : 'At Risk'}
                </p>
              </div>
              {isOnTrack ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Sprint {chartType === 'burndown' ? 'Burndown' : 'Burnup'} Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ 
                    value: chartType === 'burndown' ? 'Story Points Remaining' : 'Story Points Completed', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="ideal" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  name="Ideal"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey={chartType === 'burndown' ? 'remaining' : 'completed'}
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  name={chartType === 'burndown' ? 'Actual Remaining' : 'Actual Completed'}
                />
                {chartType === 'burndown' && (
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sprint Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Days Remaining:</span>
              <span className="font-medium">
                {Math.max(0, 14 - burndownData.length + 1)} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Velocity Needed:</span>
              <span className="font-medium">
                {(remainingPoints / Math.max(1, 14 - burndownData.length + 1)).toFixed(1)} pts/day
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Current Velocity:</span>
              <span className="font-medium">
                {burndownData.length > 1 ? 
                  ((burndownData[burndownData.length - 1]?.completed || 0) / burndownData.length).toFixed(1) : 
                  '0'} pts/day
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isOnTrack ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Sprint is on track! Maintain current pace to meet goals.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Sprint is behind schedule. Consider scope adjustment or resource reallocation.
                </p>
              </div>
            )}
            
            {remainingPoints / Math.max(1, 14 - burndownData.length + 1) > 5 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  High velocity required to complete remaining work.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
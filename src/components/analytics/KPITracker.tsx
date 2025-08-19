import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, Target, Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KPI {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'on-track' | 'at-risk' | 'off-track';
  category: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

interface KPITrackerProps {
  projectId?: string;
}

export function KPITracker({ projectId }: KPITrackerProps) {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKPI, setNewKPI] = useState({
    name: '',
    description: '',
    target: 0,
    unit: '',
    category: '',
    period: 'monthly' as const
  });
  const { toast } = useToast();

  useEffect(() => {
    loadKPIs();
  }, [projectId]);

  const loadKPIs = async () => {
    try {
      // In a real implementation, this would load from the database
      // For now, we'll use mock data
      const mockKPIs: KPI[] = [
        {
          id: '1',
          name: 'Task Completion Rate',
          description: 'Percentage of tasks completed on time',
          target: 90,
          current: 87,
          unit: '%',
          trend: 'up',
          status: 'on-track',
          category: 'Performance',
          period: 'monthly'
        },
        {
          id: '2',
          name: 'Average Resolution Time',
          description: 'Average time to resolve tasks',
          target: 3,
          current: 3.5,
          unit: 'days',
          trend: 'down',
          status: 'at-risk',
          category: 'Efficiency',
          period: 'weekly'
        },
        {
          id: '3',
          name: 'Team Velocity',
          description: 'Story points completed per sprint',
          target: 50,
          current: 45,
          unit: 'points',
          trend: 'stable',
          status: 'at-risk',
          category: 'Velocity',
          period: 'weekly'
        },
        {
          id: '4',
          name: 'Bug Fix Rate',
          description: 'Percentage of bugs fixed within SLA',
          target: 95,
          current: 92,
          unit: '%',
          trend: 'up',
          status: 'on-track',
          category: 'Quality',
          period: 'monthly'
        }
      ];
      
      setKpis(mockKPIs);
    } catch (error) {
      console.error('Error loading KPIs:', error);
      toast({
        title: "Error",
        description: "Failed to load KPIs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addKPI = async () => {
    try {
      const kpi: KPI = {
        id: Date.now().toString(),
        ...newKPI,
        current: 0,
        trend: 'stable',
        status: 'on-track'
      };
      
      setKpis(prev => [...prev, kpi]);
      setNewKPI({
        name: '',
        description: '',
        target: 0,
        unit: '',
        category: '',
        period: 'monthly'
      });
      
      toast({
        title: "Success",
        description: "KPI added successfully"
      });
    } catch (error) {
      console.error('Error adding KPI:', error);
      toast({
        title: "Error",
        description: "Failed to add KPI",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: KPI['status']) => {
    switch (status) {
      case 'on-track': return 'bg-green-500';
      case 'at-risk': return 'bg-yellow-500';
      case 'off-track': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: KPI['trend']) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading KPIs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">KPI Tracker</h2>
          <p className="text-muted-foreground">Monitor key performance indicators</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add KPI
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New KPI</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">KPI Name</Label>
                <Input
                  id="name"
                  value={newKPI.name}
                  onChange={(e) => setNewKPI(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter KPI name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newKPI.description}
                  onChange={(e) => setNewKPI(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target">Target</Label>
                  <Input
                    id="target"
                    type="number"
                    value={newKPI.target}
                    onChange={(e) => setNewKPI(prev => ({ ...prev, target: parseFloat(e.target.value) }))}
                    placeholder="Target value"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={newKPI.unit}
                    onChange={(e) => setNewKPI(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., %, days, points"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newKPI.category}
                  onChange={(e) => setNewKPI(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Performance, Quality"
                />
              </div>
              <Button onClick={addKPI} className="w-full">
                Add KPI
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi) => {
          const progress = (kpi.current / kpi.target) * 100;
          
          return (
            <Card key={kpi.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{kpi.name}</CardTitle>
                  {getTrendIcon(kpi.trend)}
                </div>
                <p className="text-sm text-muted-foreground">{kpi.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">
                    {kpi.current}{kpi.unit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Target: {kpi.target}{kpi.unit}
                  </div>
                </div>
                
                <Progress value={Math.min(progress, 100)} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{kpi.category}</Badge>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(kpi.status)}`} />
                    <span className="text-sm capitalize">{kpi.status.replace('-', ' ')}</span>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Updated {kpi.period}
                </div>
                
                {kpi.status === 'off-track' && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Requires attention</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {kpis.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No KPIs Configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add KPIs to track your team's performance and progress.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First KPI
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
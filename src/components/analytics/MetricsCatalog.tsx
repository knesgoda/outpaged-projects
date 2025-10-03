import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp, Clock, Target, Zap, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Metric {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  formula: string;
  unit: string;
  aggregation: string;
  version: number;
  is_active: boolean;
}

const METRIC_CATEGORIES = [
  { value: 'delivery', label: 'Delivery', icon: TrendingUp, color: 'text-blue-600' },
  { value: 'agile', label: 'Agile', icon: Zap, color: 'text-purple-600' },
  { value: 'devops', label: 'DevOps', icon: Clock, color: 'text-green-600' },
  { value: 'ops', label: 'Operations', icon: Target, color: 'text-orange-600' },
  { value: 'team', label: 'Team', icon: Users, color: 'text-pink-600' },
];

const DEFAULT_METRICS = [
  {
    name: 'throughput',
    display_name: 'Throughput',
    description: 'Number of items completed per time period',
    category: 'delivery',
    formula: 'COUNT(items WHERE status=done AND completed_at IN period)',
    unit: 'items/week',
    aggregation: 'count',
  },
  {
    name: 'velocity',
    display_name: 'Velocity',
    description: 'Story points completed per sprint',
    category: 'agile',
    formula: 'SUM(story_points WHERE status=done AND sprint=current)',
    unit: 'points/sprint',
    aggregation: 'sum',
  },
  {
    name: 'lead_time',
    display_name: 'Lead Time',
    description: 'Time from creation to completion',
    category: 'delivery',
    formula: 'AVG(completed_at - created_at WHERE status=done)',
    unit: 'days',
    aggregation: 'avg',
  },
  {
    name: 'cycle_time',
    display_name: 'Cycle Time',
    description: 'Time from start to completion',
    category: 'delivery',
    formula: 'AVG(completed_at - started_at WHERE status=done)',
    unit: 'days',
    aggregation: 'avg',
  },
  {
    name: 'wip',
    display_name: 'Work in Progress',
    description: 'Current number of items being worked on',
    category: 'delivery',
    formula: 'COUNT(items WHERE status=in_progress)',
    unit: 'items',
    aggregation: 'count',
  },
];

export function MetricsCatalog() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newMetric, setNewMetric] = useState({
    name: '',
    display_name: '',
    description: '',
    category: 'delivery',
    formula: '',
    unit: '',
    aggregation: 'sum',
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('metrics_catalog' as any)
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) {
        console.warn('Metrics catalog table not available:', error.message);
        setMetrics([]);
        return;
      }
      setMetrics((data as any[]) || []);
    } catch (error) {
      console.warn('Error loading metrics:', error);
      setMetrics([]);
    }
  };

  const createMetric = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('metrics_catalog' as any).insert({
        ...newMetric,
        owner_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Metric created successfully",
      });

      setIsCreating(false);
      setNewMetric({
        name: '',
        display_name: '',
        description: '',
        category: 'delivery',
        formula: '',
        unit: '',
        aggregation: 'sum',
      });
      loadMetrics();
    } catch (error) {
      console.error('Error creating metric:', error);
      toast({
        title: "Error",
        description: "Failed to create metric",
        variant: "destructive",
      });
    }
  };

  const seedDefaultMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const metricsToInsert = DEFAULT_METRICS.map(m => ({
        ...m,
        owner_id: user.id,
      }));

      const { error } = await supabase.from('metrics_catalog' as any).insert(metricsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default metrics added successfully",
      });

      loadMetrics();
    } catch (error) {
      console.error('Error seeding metrics:', error);
      toast({
        title: "Error",
        description: "Failed to add default metrics",
        variant: "destructive",
      });
    }
  };

  const filteredMetrics = selectedCategory === 'all' 
    ? metrics 
    : metrics.filter(m => m.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    const cat = METRIC_CATEGORIES.find(c => c.value === category);
    return cat?.icon || TrendingUp;
  };

  const getCategoryColor = (category: string) => {
    const cat = METRIC_CATEGORIES.find(c => c.value === category);
    return cat?.color || 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Metrics Catalog</h2>
          <p className="text-muted-foreground">Define and manage semantic metrics</p>
        </div>
        <div className="flex gap-2">
          {metrics.length === 0 && (
            <Button variant="outline" onClick={seedDefaultMetrics}>
              Add Default Metrics
            </Button>
          )}
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Metric
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Metric</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name (identifier)</Label>
                    <Input
                      value={newMetric.name}
                      onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })}
                      placeholder="throughput"
                    />
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input
                      value={newMetric.display_name}
                      onChange={(e) => setNewMetric({ ...newMetric, display_name: e.target.value })}
                      placeholder="Throughput"
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newMetric.description}
                    onChange={(e) => setNewMetric({ ...newMetric, description: e.target.value })}
                    placeholder="Number of items completed per time period"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={newMetric.category} onValueChange={(v) => setNewMetric({ ...newMetric, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METRIC_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={newMetric.unit}
                      onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
                      placeholder="items/week"
                    />
                  </div>
                  <div>
                    <Label>Aggregation</Label>
                    <Select value={newMetric.aggregation} onValueChange={(v) => setNewMetric({ ...newMetric, aggregation: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="avg">Average</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Formula</Label>
                  <Textarea
                    value={newMetric.formula}
                    onChange={(e) => setNewMetric({ ...newMetric, formula: e.target.value })}
                    placeholder="COUNT(items WHERE status=done)"
                    className="font-mono text-sm"
                  />
                </div>
                <Button onClick={createMetric} className="w-full">Create Metric</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('all')}
          size="sm"
        >
          All
        </Button>
        {METRIC_CATEGORIES.map(cat => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(cat.value)}
            size="sm"
          >
            <cat.icon className={`h-4 w-4 mr-2 ${selectedCategory === cat.value ? '' : cat.color}`} />
            {cat.label}
          </Button>
        ))}
      </div>

      {filteredMetrics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No metrics yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first metric or add default metrics to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMetrics.map(metric => {
            const Icon = getCategoryIcon(metric.category);
            return (
              <Card key={metric.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${getCategoryColor(metric.category)}`} />
                      <CardTitle className="text-base">{metric.display_name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">v{metric.version}</Badge>
                  </div>
                  <CardDescription>{metric.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Unit:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{metric.unit}</code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Aggregation:</span>
                    <Badge variant="secondary">{metric.aggregation}</Badge>
                  </div>
                  <div className="text-xs font-mono bg-muted p-2 rounded mt-2 overflow-x-auto">
                    {metric.formula}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

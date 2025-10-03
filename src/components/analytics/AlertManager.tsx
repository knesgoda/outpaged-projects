import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface AlertManagerProps {
  projectId?: string;
}

export function AlertManager({ projectId }: AlertManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    metric_id: '',
    operator: 'gt',
    value: '',
    window: '7d',
    channels: ['email'],
    is_active: true,
  });

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alert-definitions', projectId],
    queryFn: async () => {
      try {
        const query = supabase
          .from('alert_definitions' as any)
          .select('*, metrics_catalog(*), alert_history(*)');
        
        if (projectId) {
          query.eq('project_id', projectId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          console.warn('Alert definitions table not available:', error.message);
          return [];
        }
        return data || [];
      } catch (error) {
        console.warn('Failed to fetch alerts:', error);
        return [];
      }
    },
    retry: false,
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['metrics-catalog'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('metrics_catalog' as any)
          .select('*')
          .eq('is_active', true);
        if (error) {
          console.warn('Metrics catalog not available:', error.message);
          return [];
        }
        return data || [];
      } catch (error) {
        console.warn('Failed to fetch metrics:', error);
        return [];
      }
    },
    retry: false,
  });

  const createAlert = useMutation({
    mutationFn: async (alertData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('alert_definitions' as any)
        .insert({
          ...alertData,
          project_id: projectId,
          created_by: user.id,
          threshold_config: {
            operator: alertData.operator,
            value: parseFloat(alertData.value),
            window: alertData.window,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-definitions'] });
      toast({ title: "Alert created successfully" });
      setOpen(false);
      setFormData({
        name: '',
        description: '',
        metric_id: '',
        operator: 'gt',
        value: '',
        window: '7d',
        channels: ['email'],
        is_active: true,
      });
    },
  });

  const deleteAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alert_definitions' as any)
        .delete()
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-definitions'] });
      toast({ title: "Alert deleted" });
    },
  });

  const toggleAlert = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('alert_definitions' as any)
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-definitions'] });
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading alerts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alert Management</h2>
          <p className="text-sm text-muted-foreground">
            Configure threshold-based alerts for your metrics
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Alert</DialogTitle>
              <DialogDescription>
                Set up a threshold-based alert to monitor your metrics
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Alert Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., High Cycle Time Alert"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What should this alert monitor?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metric">Metric</Label>
                  <Select
                    value={formData.metric_id}
                    onValueChange={(value) => setFormData({ ...formData, metric_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {metrics?.map((metric: any) => (
                        <SelectItem key={metric.id} value={metric.id}>
                          {metric.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="operator">Condition</Label>
                  <Select
                    value={formData.operator}
                    onValueChange={(value) => setFormData({ ...formData, operator: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gt">Greater than</SelectItem>
                      <SelectItem value="lt">Less than</SelectItem>
                      <SelectItem value="eq">Equal to</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Threshold Value</Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="window">Time Window</Label>
                  <Select
                    value={formData.window}
                    onValueChange={(value) => setFormData({ ...formData, window: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last hour</SelectItem>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createAlert.mutate(formData)}>Create Alert</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {alerts?.map((alert: any) => {
          const recentTriggers = alert.alert_history?.filter((h: any) => !h.resolved_at).length || 0;
          
          return (
            <Card key={alert.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      {alert.name}
                      {recentTriggers > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {recentTriggers} active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{alert.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={(checked) => 
                        toggleAlert.mutate({ id: alert.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAlert.mutate(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Metric</div>
                    <div className="font-medium">{alert.metrics_catalog?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Condition</div>
                    <div className="font-medium">
                      {alert.threshold_config?.operator === 'gt' ? '>' : 
                       alert.threshold_config?.operator === 'lt' ? '<' : '='}
                      {' '}{alert.threshold_config?.value}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Window</div>
                    <div className="font-medium">{alert.threshold_config?.window}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="flex items-center gap-1">
                      {alert.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">
                        {alert.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!alerts?.length && (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first alert to start monitoring your metrics
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

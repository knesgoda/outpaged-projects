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
import { Calendar, Plus, Trash2, Clock, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ReportSchedulerProps {
  projectId?: string;
}

export function ReportScheduler({ projectId }: ReportSchedulerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    dashboard_id: '',
    name: '',
    description: '',
    schedule_cron: '0 9 * * 1', // Monday 9am
    format: 'pdf',
    channels: ['email'],
    is_active: true,
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['report-schedules', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_schedules' as any)
        .select('*, dashboards(*), report_deliveries(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: dashboards } = useQuery({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboards' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createSchedule = useMutation({
    mutationFn: async (scheduleData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('report_schedules' as any)
        .insert({
          ...scheduleData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast({ title: "Report schedule created successfully" });
      setOpen(false);
      setFormData({
        dashboard_id: '',
        name: '',
        description: '',
        schedule_cron: '0 9 * * 1',
        format: 'pdf',
        channels: ['email'],
        is_active: true,
      });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      const { error } = await supabase
        .from('report_schedules' as any)
        .delete()
        .eq('id', scheduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast({ title: "Schedule deleted" });
    },
  });

  const toggleSchedule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('report_schedules' as any)
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
    },
  });

  const cronToReadable = (cron: string) => {
    const patterns: Record<string, string> = {
      '0 9 * * 1': 'Every Monday at 9:00 AM',
      '0 9 * * *': 'Every day at 9:00 AM',
      '0 9 * * 5': 'Every Friday at 9:00 AM',
      '0 9 1 * *': 'First day of every month at 9:00 AM',
    };
    return patterns[cron] || cron;
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading schedules...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Scheduling</h2>
          <p className="text-sm text-muted-foreground">
            Automate report delivery via email and Slack
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Report Schedule</DialogTitle>
              <DialogDescription>
                Automatically deliver dashboard reports on a schedule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dashboard">Dashboard</Label>
                <Select
                  value={formData.dashboard_id}
                  onValueChange={(value) => setFormData({ ...formData, dashboard_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dashboard" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboards?.map((dashboard: any) => (
                      <SelectItem key={dashboard.id} value={dashboard.id}>
                        {dashboard.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Schedule Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Weekly Sprint Report"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this report for?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule</Label>
                  <Select
                    value={formData.schedule_cron}
                    onValueChange={(value) => setFormData({ ...formData, schedule_cron: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0 9 * * 1">Every Monday at 9:00 AM</SelectItem>
                      <SelectItem value="0 9 * * 5">Every Friday at 9:00 AM</SelectItem>
                      <SelectItem value="0 9 * * *">Every day at 9:00 AM</SelectItem>
                      <SelectItem value="0 9 1 * *">First day of month at 9:00 AM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value) => setFormData({ ...formData, format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="png">PNG Image</SelectItem>
                      <SelectItem value="csv">CSV Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createSchedule.mutate(formData)}>Create Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {schedules?.map((schedule: any) => {
          const lastDelivery = schedule.report_deliveries?.[0];
          
          return (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {schedule.name}
                    </CardTitle>
                    <CardDescription>{schedule.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => 
                        toggleSchedule.mutate({ id: schedule.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSchedule.mutate(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Dashboard</div>
                    <div className="font-medium">{schedule.dashboards?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Schedule</div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">{cronToReadable(schedule.schedule_cron)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Format</div>
                    <Badge variant="outline">{schedule.format.toUpperCase()}</Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Last Delivery</div>
                    <div className="font-medium">
                      {lastDelivery ? (
                        format(new Date(lastDelivery.delivered_at), 'MMM d, HH:mm')
                      ) : (
                        'Never'
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!schedules?.length && (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No schedules configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first report schedule to automate dashboard delivery
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

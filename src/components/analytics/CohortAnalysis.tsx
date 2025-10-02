import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CohortAnalysisProps {
  projectId?: string;
}

export function CohortAnalysis({ projectId }: CohortAnalysisProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cohort_type: 'intake_month',
  });

  const { data: cohorts } = useQuery({
    queryKey: ['cohort-definitions', projectId],
    queryFn: async () => {
      let query = supabase
        .from('cohort_definitions' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Mock cohort data
  const cohortData = [
    { week: 0, jan_cohort: 100, feb_cohort: 100, mar_cohort: 100 },
    { week: 1, jan_cohort: 85, feb_cohort: 90, mar_cohort: 92 },
    { week: 2, jan_cohort: 78, feb_cohort: 82, mar_cohort: 88 },
    { week: 3, jan_cohort: 72, feb_cohort: 78, mar_cohort: 85 },
    { week: 4, jan_cohort: 68, feb_cohort: 72, mar_cohort: 82 },
    { week: 5, jan_cohort: 65, feb_cohort: 70, mar_cohort: 80 },
  ];

  const createCohort = useMutation({
    mutationFn: async (cohortData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('cohort_definitions' as any)
        .insert({
          ...cohortData,
          project_id: projectId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohort-definitions'] });
      toast({ title: "Cohort created successfully" });
      setOpen(false);
      setFormData({ name: '', description: '', cohort_type: 'intake_month' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cohort Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Track and compare groups of items over time
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Cohort
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Cohort</DialogTitle>
              <DialogDescription>
                Define a cohort to track items grouped by common criteria
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Cohort Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., January 2025 Intake"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What defines this cohort?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Cohort Type</Label>
                <Select
                  value={formData.cohort_type}
                  onValueChange={(value) => setFormData({ ...formData, cohort_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intake_month">Intake Month</SelectItem>
                    <SelectItem value="sprint">Sprint</SelectItem>
                    <SelectItem value="custom">Custom Criteria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createCohort.mutate(formData)}>Create Cohort</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cohort Retention Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention Curves</CardTitle>
          <CardDescription>Completion percentage over time by cohort</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={cohortData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                className="text-xs"
                label={{ value: 'Weeks Since Intake', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                className="text-xs"
                label={{ value: '% Completed', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="jan_cohort" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                name="January Cohort"
              />
              <Line 
                type="monotone" 
                dataKey="feb_cohort" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="February Cohort"
              />
              <Line 
                type="monotone" 
                dataKey="mar_cohort" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                name="March Cohort"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cohort Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Comparison</CardTitle>
          <CardDescription>Key metrics by cohort</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted">
              <tr>
                <th className="text-left py-2 px-3">Cohort</th>
                <th className="text-right py-2 px-3">Size</th>
                <th className="text-right py-2 px-3">Completed</th>
                <th className="text-right py-2 px-3">Avg Cycle Time</th>
                <th className="text-right py-2 px-3">Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">January 2025</td>
                <td className="text-right py-2 px-3">156</td>
                <td className="text-right py-2 px-3">102</td>
                <td className="text-right py-2 px-3">4.2 days</td>
                <td className="text-right py-2 px-3">65%</td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">February 2025</td>
                <td className="text-right py-2 px-3">142</td>
                <td className="text-right py-2 px-3">99</td>
                <td className="text-right py-2 px-3">3.8 days</td>
                <td className="text-right py-2 px-3">70%</td>
              </tr>
              <tr className="border-b hover:bg-muted/30">
                <td className="py-2 px-3 font-medium">March 2025</td>
                <td className="text-right py-2 px-3">168</td>
                <td className="text-right py-2 px-3">134</td>
                <td className="text-right py-2 px-3">3.5 days</td>
                <td className="text-right py-2 px-3">80%</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Saved Cohorts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Saved Cohorts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {cohorts?.map((cohort: any) => (
              <div key={cohort.id} className="p-3 border rounded-lg">
                <div className="font-medium">{cohort.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {cohort.description} • Type: {cohort.cohort_type}
                </div>
              </div>
            ))}
            {!cohorts?.length && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No cohorts defined yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

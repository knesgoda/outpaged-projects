import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, AlertCircle, Rocket, PieChart, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  widgets: any[];
  tags: string[];
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'sprint-retro',
    name: 'Sprint Retrospective',
    description: 'Velocity, burn-down, scope changes, and completed items for sprint reviews',
    category: 'Agile',
    icon: Activity,
    tags: ['Agile', 'Sprint', 'Team'],
    widgets: [
      { type: 'kpi', title: 'Velocity', metric: 'velocity' },
      { type: 'line', title: 'Burn Down', metric: 'remaining_points' },
      { type: 'bar', title: 'Scope Changes', metric: 'scope_change' },
      { type: 'table', title: 'Completed Items', metric: 'completed_items' },
    ],
  },
  {
    id: 'delivery-health',
    name: 'Delivery Health',
    description: 'Throughput, lead/cycle time, flow efficiency, and WIP tracking',
    category: 'Delivery',
    icon: TrendingUp,
    tags: ['Delivery', 'Flow', 'Metrics'],
    widgets: [
      { type: 'line', title: 'Throughput Trend', metric: 'throughput' },
      { type: 'bar', title: 'Lead Time Distribution', metric: 'lead_time' },
      { type: 'gauge', title: 'Flow Efficiency', metric: 'flow_efficiency' },
      { type: 'kpi', title: 'Current WIP', metric: 'wip' },
    ],
  },
  {
    id: 'ops-command',
    name: 'Operations Command Center',
    description: 'MTTA/MTTR, SLA compliance, incident volume, and change tracking',
    category: 'Operations',
    icon: AlertCircle,
    tags: ['Ops', 'ITSM', 'SLA'],
    widgets: [
      { type: 'kpi', title: 'MTTA', metric: 'mtta' },
      { type: 'kpi', title: 'MTTR', metric: 'mttr' },
      { type: 'gauge', title: 'SLA Compliance', metric: 'sla_compliance' },
      { type: 'bar', title: 'Incidents by Severity', metric: 'incidents' },
    ],
  },
  {
    id: 'release-review',
    name: 'Release Review',
    description: 'Readiness scores, issues per release, change failure rate, and release notes',
    category: 'DevOps',
    icon: Rocket,
    tags: ['DevOps', 'Release', 'DORA'],
    widgets: [
      { type: 'gauge', title: 'Release Readiness', metric: 'readiness_score' },
      { type: 'bar', title: 'Issues per Release', metric: 'release_issues' },
      { type: 'kpi', title: 'Change Failure Rate', metric: 'change_failure_rate' },
      { type: 'table', title: 'Recent Releases', metric: 'releases' },
    ],
  },
  {
    id: 'team-performance',
    name: 'Team Performance',
    description: 'Individual and team metrics, capacity utilization, and collaboration stats',
    category: 'Team',
    icon: Users,
    tags: ['Team', 'Performance', 'Capacity'],
    widgets: [
      { type: 'bar', title: 'Tasks by Team Member', metric: 'tasks_by_user' },
      { type: 'pie', title: 'Capacity Utilization', metric: 'capacity' },
      { type: 'kpi', title: 'Team Velocity', metric: 'team_velocity' },
      { type: 'line', title: 'Completion Trend', metric: 'completion_trend' },
    ],
  },
  {
    id: 'executive-weekly',
    name: 'Executive Weekly',
    description: 'High-level portfolio health, risks, throughput trends, and key metrics',
    category: 'Executive',
    icon: BarChart3,
    tags: ['Executive', 'Portfolio', 'Overview'],
    widgets: [
      { type: 'kpi', title: 'Initiative Health', metric: 'initiative_health' },
      { type: 'line', title: 'Throughput Trend', metric: 'throughput' },
      { type: 'bar', title: 'Risk Distribution', metric: 'risks' },
      { type: 'pie', title: 'Status Overview', metric: 'status_overview' },
    ],
  },
];

export function DashboardTemplates({ onSelectTemplate }: { onSelectTemplate?: (template: DashboardTemplate) => void }) {
  const { toast } = useToast();

  const createFromTemplate = async (template: DashboardTemplate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('dashboards' as any).insert({
        name: template.name,
        description: template.description,
        config: { widgets: template.widgets },
        owner_id: user.id,
        is_template: false,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Dashboard "${template.name}" created from template`,
      });

      if (onSelectTemplate) {
        onSelectTemplate(template);
      }
    } catch (error) {
      console.error('Error creating dashboard from template:', error);
      toast({
        title: "Error",
        description: "Failed to create dashboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Templates</h2>
        <p className="text-muted-foreground">Start with pre-built dashboards for common use cases</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Icon className="h-8 w-8 text-primary" />
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>{template.widgets.length}</strong> widgets included
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => createFromTemplate(template)}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

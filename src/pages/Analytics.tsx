import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdvancedDashboardBuilder } from '@/components/analytics/AdvancedDashboardBuilder';
import { MetricsCatalog } from '@/components/analytics/MetricsCatalog';
import { DashboardTemplates } from '@/components/analytics/DashboardTemplates';
import { TaskVelocityChart } from '@/components/analytics/TaskVelocityChart';
import { BurndownChart } from '@/components/analytics/BurndownChart';
import { TeamPerformanceWidget } from '@/components/analytics/TeamPerformanceWidget';
import { KPITracker } from '@/components/analytics/KPITracker';
import { ReportsGenerator } from '@/components/analytics/ReportsGenerator';
import { BarChart3, TrendingUp, Users, Target, FileText, Activity, Database, Layout } from 'lucide-react';

export default function Analytics() {
  const [activeProject, setActiveProject] = useState<string | undefined>();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reporting</h1>
          <p className="text-muted-foreground">
            Advanced analytics with semantic metrics and interactive dashboards
          </p>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="velocity" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Velocity
          </TabsTrigger>
          <TabsTrigger value="burndown" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Burndown
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            KPIs
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <AdvancedDashboardBuilder projectId={activeProject} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <DashboardTemplates />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <MetricsCatalog />
        </TabsContent>

        <TabsContent value="velocity" className="space-y-6">
          <TaskVelocityChart projectId={activeProject} />
        </TabsContent>

        <TabsContent value="burndown" className="space-y-6">
          <BurndownChart projectId={activeProject} />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <TeamPerformanceWidget projectId={activeProject} />
        </TabsContent>

        <TabsContent value="kpis" className="space-y-6">
          <KPITracker projectId={activeProject} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportsGenerator projectId={activeProject} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
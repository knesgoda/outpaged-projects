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
import { ControlChart } from '@/components/analytics/ControlChart';
import { SankeyDiagram } from '@/components/analytics/SankeyDiagram';
import { AlertManager } from '@/components/analytics/AlertManager';
import { ReportScheduler } from '@/components/analytics/ReportScheduler';
import { DORAMetrics } from '@/components/analytics/DORAMetrics';
import { BarChart3, TrendingUp, Users, Target, FileText, Activity, Database, Layout, Bell, Calendar, Zap, GitBranch } from 'lucide-react';

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
        <TabsList className="grid w-full grid-cols-12">
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
          <TabsTrigger value="dora" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            DORA
          </TabsTrigger>
          <TabsTrigger value="control" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Control
          </TabsTrigger>
          <TabsTrigger value="flow" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Flow
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="velocity" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Velocity
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

        <TabsContent value="dora" className="space-y-6">
          <DORAMetrics projectId={activeProject} />
        </TabsContent>

        <TabsContent value="control" className="space-y-6">
          <ControlChart projectId={activeProject} />
        </TabsContent>

        <TabsContent value="flow" className="space-y-6">
          <SankeyDiagram projectId={activeProject} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <AlertManager projectId={activeProject} />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <ReportScheduler projectId={activeProject} />
        </TabsContent>

        <TabsContent value="velocity" className="space-y-6">
          <TaskVelocityChart projectId={activeProject} />
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
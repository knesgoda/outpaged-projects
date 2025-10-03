import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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
import { DSLEditor } from '@/components/analytics/DSLEditor';
import { SQLConsole } from '@/components/analytics/SQLConsole';
import { PeriodComparison } from '@/components/analytics/PeriodComparison';
import { CohortAnalysis } from '@/components/analytics/CohortAnalysis';
import { ForecastingEngine } from '@/components/analytics/ForecastingEngine';
import { ScenarioPlanner } from '@/components/analytics/ScenarioPlanner';
import { BarChart3, TrendingUp, Users, Target, FileText, Activity, Database, Layout, Bell, Calendar, Zap, GitBranch, Code, LineChart, Users2, TrendingUpIcon, Calculator } from 'lucide-react';

function AnalyticsErrorFallback() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Analytics Unavailable</AlertTitle>
      <AlertDescription>
        Some analytics features are temporarily unavailable. Database tables may need to be initialized.
        Please contact your administrator if this persists.
      </AlertDescription>
    </Alert>
  );
}

export default function Analytics() {
  const [activeProject, setActiveProject] = useState<string | undefined>();

  return (
    <ErrorBoundary fallback={<AnalyticsErrorFallback />}>
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
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="builder" className="flex items-center gap-2 whitespace-nowrap">
              <Layout className="w-4 h-4" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2 whitespace-nowrap">
              <BarChart3 className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2 whitespace-nowrap">
              <Database className="w-4 h-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="dora" className="flex items-center gap-2 whitespace-nowrap">
              <Zap className="w-4 h-4" />
              DORA
            </TabsTrigger>
            <TabsTrigger value="control" className="flex items-center gap-2 whitespace-nowrap">
              <Activity className="w-4 h-4" />
              Control
            </TabsTrigger>
            <TabsTrigger value="flow" className="flex items-center gap-2 whitespace-nowrap">
              <GitBranch className="w-4 h-4" />
              Flow
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2 whitespace-nowrap">
              <Bell className="w-4 h-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex items-center gap-2 whitespace-nowrap">
              <Calendar className="w-4 h-4" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="dsl" className="flex items-center gap-2 whitespace-nowrap">
              <Code className="w-4 h-4" />
              DSL
            </TabsTrigger>
            <TabsTrigger value="sql" className="flex items-center gap-2 whitespace-nowrap">
              <Database className="w-4 h-4" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2 whitespace-nowrap">
              <LineChart className="w-4 h-4" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="cohorts" className="flex items-center gap-2 whitespace-nowrap">
              <Users2 className="w-4 h-4" />
              Cohorts
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-2 whitespace-nowrap">
              <TrendingUpIcon className="w-4 h-4" />
              Forecast
            </TabsTrigger>
            <TabsTrigger value="scenario" className="flex items-center gap-2 whitespace-nowrap">
              <Calculator className="w-4 h-4" />
              Scenario
            </TabsTrigger>
            <TabsTrigger value="velocity" className="flex items-center gap-2 whitespace-nowrap">
              <TrendingUp className="w-4 h-4" />
              Velocity
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2 whitespace-nowrap">
              <Users className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="kpis" className="flex items-center gap-2 whitespace-nowrap">
              <Target className="w-4 h-4" />
              KPIs
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2 whitespace-nowrap">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
          </TabsList>
        </div>

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

        <TabsContent value="dsl" className="space-y-6">
          <DSLEditor projectId={activeProject} />
        </TabsContent>

        <TabsContent value="sql" className="space-y-6">
          <SQLConsole projectId={activeProject} />
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <PeriodComparison projectId={activeProject} />
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-6">
          <CohortAnalysis projectId={activeProject} />
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <ForecastingEngine projectId={activeProject} />
        </TabsContent>

        <TabsContent value="scenario" className="space-y-6">
          <ScenarioPlanner projectId={activeProject} />
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
    </ErrorBoundary>
  );
}
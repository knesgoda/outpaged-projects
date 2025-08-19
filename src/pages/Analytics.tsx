import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomDashboard } from '@/components/analytics/CustomDashboard';
import { TaskVelocityChart } from '@/components/analytics/TaskVelocityChart';
import { BurndownChart } from '@/components/analytics/BurndownChart';
import { TeamPerformanceWidget } from '@/components/analytics/TeamPerformanceWidget';
import { KPITracker } from '@/components/analytics/KPITracker';
import { ReportsGenerator } from '@/components/analytics/ReportsGenerator';
import { AnalyticsDashboard } from '@/components/monitoring/AnalyticsDashboard';
import { BarChart3, TrendingUp, Users, Target, FileText, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Analytics() {
  const { user } = useAuth();
  const [activeProject, setActiveProject] = useState<string | undefined>();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reporting</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into team performance and project metrics
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Dashboard
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

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomDashboard projectId={activeProject} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>System Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsDashboard />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="velocity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Velocity Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track team velocity and sprint performance over time
              </p>
            </CardHeader>
            <CardContent>
              <TaskVelocityChart projectId={activeProject} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="burndown" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sprint Burndown Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor sprint progress and identify potential issues
              </p>
            </CardHeader>
            <CardContent>
              <BurndownChart projectId={activeProject} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Insights</CardTitle>
              <p className="text-sm text-muted-foreground">
                Analyze individual and team performance metrics
              </p>
            </CardHeader>
            <CardContent>
              <TeamPerformanceWidget projectId={activeProject} />
            </CardContent>
          </Card>
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
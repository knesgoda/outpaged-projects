import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestingDashboard } from '@/components/testing/TestingDashboard';
import { BetaFeedback } from '@/components/testing/BetaFeedback';
import { SystemStatusCheck } from '@/components/testing/SystemStatusCheck';

export default function QualityAssurance() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quality Assurance</h1>
        <p className="text-muted-foreground">
          Testing, feedback, and system health monitoring
        </p>
      </div>

      <Tabs defaultValue="testing" className="space-y-6">
        <TabsList>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="feedback">Beta Feedback</TabsTrigger>
          <TabsTrigger value="status">System Status</TabsTrigger>
        </TabsList>

        <TabsContent value="testing">
          <TestingDashboard />
        </TabsContent>

        <TabsContent value="feedback">
          <BetaFeedback />
        </TabsContent>

        <TabsContent value="status">
          <SystemStatusCheck />
        </TabsContent>
      </Tabs>
    </div>
  );
}

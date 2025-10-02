import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditLogViewer } from '@/components/security/AuditLogViewer';
import { ComplianceReports } from '@/components/security/ComplianceReports';
import { SecurityPolicyManager } from '@/components/security/SecurityPolicyManager';
import { SecurityDashboard } from '@/components/security/SecurityDashboard';

export default function SecurityCompliance() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security & Compliance</h1>
        <p className="text-muted-foreground">
          Manage security policies, audit logs, and compliance reporting
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="policies">Security Policies</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="policies">
          <SecurityPolicyManager />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}

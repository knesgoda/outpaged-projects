import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncidentManagementPanel } from "@/components/operations/IncidentManagementPanel";
import { OnCallRotationPanel } from "@/components/operations/OnCallRotationPanel";
import { ChangeManagementPanel } from "@/components/operations/ChangeManagementPanel";
import { ServiceRegistryPanel } from "@/components/operations/ServiceRegistryPanel";
import { DependencyImpactPanel } from "@/components/operations/DependencyImpactPanel";
import { SlaEscalationPanel } from "@/components/operations/SlaEscalationPanel";
import { SavedSearchPanel } from "@/components/operations/SavedSearchPanel";
import { OpsDashboardPanel } from "@/components/operations/OpsDashboardPanel";
import { DocsWorkspacePanel } from "@/components/operations/DocsWorkspacePanel";
import { PortfolioOkrsPanel } from "@/components/operations/PortfolioOkrsPanel";
import { ImportExportPanel } from "@/components/operations/ImportExportPanel";
import { ExecutiveReportingPanel } from "@/components/operations/ExecutiveReportingPanel";
import { ResiliencePerformancePanel } from "@/components/operations/ResiliencePerformancePanel";
import { MobileOfflinePanel } from "@/components/operations/MobileOfflinePanel";
import { AdminGovernancePanel } from "@/components/operations/AdminGovernancePanel";
import { SloDashboardPanel } from "@/components/operations/SloDashboardPanel";

export default function OperationsCenter() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operations control center</h1>
        <p className="text-muted-foreground">
          Coordinate incident response, change enablement, service ownership, and executive reporting in a single workspace.
        </p>
      </div>

      <Tabs defaultValue="phase4" className="space-y-6">
        <TabsList>
          <TabsTrigger value="phase4">Phase 4 • Incident & Change</TabsTrigger>
          <TabsTrigger value="phase5">Phase 5 • Portfolio & Docs</TabsTrigger>
          <TabsTrigger value="phase6">Phase 6 • Resilience & Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="phase4" className="space-y-6">
          <IncidentManagementPanel />
          <div className="grid gap-6 lg:grid-cols-2">
            <OnCallRotationPanel />
            <SlaEscalationPanel />
          </div>
          <ChangeManagementPanel />
          <ServiceRegistryPanel />
          <DependencyImpactPanel />
          <SavedSearchPanel />
          <OpsDashboardPanel />
        </TabsContent>

        <TabsContent value="phase5" className="space-y-6">
          <DocsWorkspacePanel />
          <PortfolioOkrsPanel />
          <ImportExportPanel />
          <ExecutiveReportingPanel />
        </TabsContent>

        <TabsContent value="phase6" className="space-y-6">
          <ResiliencePerformancePanel />
          <MobileOfflinePanel />
          <AdminGovernancePanel />
          <SloDashboardPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

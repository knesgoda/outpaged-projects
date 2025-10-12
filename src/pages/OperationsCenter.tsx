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
import { SearchDiagnosticsPanel } from "@/components/operations/SearchDiagnosticsPanel";
import { IncidentManager } from "@/components/incidents/IncidentManager";
import { OnCallSchedule } from "@/components/oncall/OnCallSchedule";
import { ServiceRegistry } from "@/components/services/ServiceRegistry";
import { ReleaseManager } from "@/components/releases/ReleaseManager";
import { ReleaseNotesGenerator } from "@/components/releases/ReleaseNotesGenerator";
import { ReleaseReadinessDashboard } from "@/components/releases/ReleaseReadinessDashboard";
import { VelocityTracker } from "@/components/analytics/VelocityTracker";

export default function OperationsCenter() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operations control center</h1>
        <p className="text-muted-foreground">
          Coordinate incident response, change enablement, service ownership, and executive reporting in a single workspace.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="oncall">On-Call</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="releases">Releases</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="phase4">Phase 4</TabsTrigger>
          <TabsTrigger value="phase5">Phase 5</TabsTrigger>
          <TabsTrigger value="phase6">Phase 6</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6">
            <OpsDashboardPanel />
          </div>
        </TabsContent>

        <TabsContent value="incidents">
          <IncidentManager />
        </TabsContent>

        <TabsContent value="oncall">
          <OnCallSchedule />
        </TabsContent>

        <TabsContent value="services">
          <ServiceRegistry />
        </TabsContent>

        <TabsContent value="releases" className="space-y-6">
          <ReleaseReadinessDashboard />
          <ReleaseManager />
          <ReleaseNotesGenerator />
        </TabsContent>

        <TabsContent value="velocity">
          <VelocityTracker />
        </TabsContent>

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
          <SearchDiagnosticsPanel />
          <SloDashboardPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

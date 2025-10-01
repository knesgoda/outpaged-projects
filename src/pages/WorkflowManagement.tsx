import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";
import { HandoffManager } from "@/components/workflows/HandoffManager";
import { HandoffDashboard } from "@/components/workflows/HandoffDashboard";
import { VisualWorkflowBuilder } from "@/components/workflows/VisualWorkflowBuilder";
import { WorkflowTemplateSelector } from "@/components/workflows/WorkflowTemplateSelector";
import { ProjectSelector } from "@/components/kanban/ProjectSelector";
import { HandoffAutomationPanel } from "@/components/workflows/HandoffAutomationPanel";
import { WorkflowRulesManager } from "@/components/workflows/WorkflowRulesManager";
import { WorkflowStateManager } from "@/components/workflows/WorkflowStateManager";

export default function WorkflowManagement() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflow Management</h1>
        <p className="text-muted-foreground">
          Create and manage custom workflows with states, transitions, and automation
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Pre-built Templates</TabsTrigger>
          <TabsTrigger value="team-workflows">Team Workflows</TabsTrigger>
          <TabsTrigger value="visual">Visual Builder</TabsTrigger>
          <TabsTrigger value="custom">Custom Builder</TabsTrigger>
          <TabsTrigger value="handoffs">Handoffs</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="validation">Validation Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <WorkflowTemplateSelector />
        </TabsContent>

        <TabsContent value="team-workflows">
          <Tabs defaultValue="marketing" className="space-y-4">
            <TabsList>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
            </TabsList>
            <TabsContent value="marketing">
              <WorkflowStateManager workflowType="marketing" />
            </TabsContent>
            <TabsContent value="operations">
              <WorkflowStateManager workflowType="operations" />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="visual">
          <VisualWorkflowBuilder />
        </TabsContent>

        <TabsContent value="custom">
          <WorkflowBuilder />
        </TabsContent>

        <TabsContent value="handoffs">
          <HandoffDashboard />
        </TabsContent>

        <TabsContent value="automation">
          <HandoffAutomationPanel />
        </TabsContent>

        <TabsContent value="validation">
          <WorkflowRulesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

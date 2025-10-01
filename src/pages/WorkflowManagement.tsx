import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";
import { HandoffManager } from "@/components/workflows/HandoffManager";
import { ProjectSelector } from "@/components/kanban/ProjectSelector";

export default function WorkflowManagement() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");

  if (!projectId) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Management</h1>
          <p className="text-muted-foreground">
            Create and manage custom workflows for your projects
          </p>
        </div>
        <ProjectSelector 
          onProjectSelect={(id) => {
            const newSearchParams = new URLSearchParams();
            newSearchParams.set('project', id);
            window.location.search = newSearchParams.toString();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workflow Management</h1>
        <p className="text-muted-foreground">
          Create and manage custom workflows for your projects
        </p>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">Workflow Builder</TabsTrigger>
          <TabsTrigger value="handoffs">Team Handoffs</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <WorkflowBuilder projectId={projectId} />
        </TabsContent>

        <TabsContent value="handoffs" className="space-y-6">
          <HandoffManager projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

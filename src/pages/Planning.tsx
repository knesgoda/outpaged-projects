import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EstimationTools } from "@/components/planning/EstimationTools";
import { WorkloadView } from "@/components/views/WorkloadView";
import { DependencyGraph } from "@/components/views/DependencyGraph";

export default function Planning() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Planning & Estimation</h1>
        <p className="text-muted-foreground">
          Prioritize work, manage capacity, and visualize dependencies
        </p>
      </div>

      <Tabs defaultValue="estimation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="estimation">Estimation Tools</TabsTrigger>
          <TabsTrigger value="workload">Team Workload</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        </TabsList>

        <TabsContent value="estimation">
          <EstimationTools />
        </TabsContent>

        <TabsContent value="workload">
          <WorkloadView />
        </TabsContent>

        <TabsContent value="dependencies">
          <DependencyGraph />
        </TabsContent>
      </Tabs>
    </div>
  );
}

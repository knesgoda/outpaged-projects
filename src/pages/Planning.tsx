import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EstimationTools } from "@/components/planning/EstimationTools";
import { WorkloadView } from "@/components/views/WorkloadView";
import { DependencyGraph } from "@/components/views/DependencyGraph";
import { SprintBoard } from "@/components/views/SprintBoard";
import { PlanningPoker } from "@/components/planning/PlanningPoker";
import { CapacityPlanner } from "@/components/planning/CapacityPlanner";
import { SprintMetrics } from "@/components/planning/SprintMetrics";

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
          <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
          <TabsTrigger value="metrics">Sprint Metrics</TabsTrigger>
          <TabsTrigger value="poker">Planning Poker</TabsTrigger>
          <TabsTrigger value="sprint">Sprint Board</TabsTrigger>
          <TabsTrigger value="workload">Team Workload</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        </TabsList>

        <TabsContent value="estimation">
          <EstimationTools />
        </TabsContent>

        <TabsContent value="capacity">
          <CapacityPlanner />
        </TabsContent>

        <TabsContent value="metrics">
          <SprintMetrics />
        </TabsContent>

        <TabsContent value="poker">
          <PlanningPoker
            taskTitle="Implement OAuth 2.0 Integration"
            taskDescription="Add support for Google and GitHub OAuth providers"
            participants={[
              { id: "current-user", name: "You" },
              { id: "user-2", name: "Alice" },
              { id: "user-3", name: "Bob" },
            ]}
          />
        </TabsContent>

        <TabsContent value="sprint">
          <SprintBoard
            sprints={[
              {
                id: "sprint-1",
                name: "Sprint 1",
                start_date: "2025-10-01",
                end_date: "2025-10-14",
                goal: "Complete core features",
                status: "active",
              },
            ]}
            tasks={[]}
          />
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

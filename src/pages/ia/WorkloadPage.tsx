import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Calendar, Grid3x3, Users, Sparkles, GitBranch } from "lucide-react";
import { WorkloadHeatmap } from "@/components/workload/WorkloadHeatmap";
import { WorkloadTimeline } from "@/components/workload/WorkloadTimeline";
import { SkillMatrix } from "@/components/workload/SkillMatrix";
import { PeopleList } from "@/components/workload/PeopleList";
import { ScenarioManager } from "@/components/workload/ScenarioManager";
import { BalancingAssistant } from "@/components/workload/BalancingAssistant";

export default function WorkloadPage() {
  const [activeTab, setActiveTab] = useState("heatmap");
  const [showAssistant, setShowAssistant] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div>
            <h1 className="text-lg font-semibold">Resource Capacity Planning</h1>
            <p className="text-sm text-muted-foreground">
              Balance workload across people and teams
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showAssistant ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAssistant(!showAssistant)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Assistant
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`flex-1 overflow-auto ${showAssistant ? "mr-96" : ""}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="border-b px-4">
              <TabsList className="bg-transparent">
                <TabsTrigger value="heatmap" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Heatmap
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  Skills
                </TabsTrigger>
                <TabsTrigger value="people" className="gap-2">
                  <Users className="h-4 w-4" />
                  People
                </TabsTrigger>
                <TabsTrigger value="scenarios" className="gap-2">
                  <GitBranch className="h-4 w-4" />
                  Scenarios
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="heatmap" className="m-0 h-full p-4">
              <WorkloadHeatmap />
            </TabsContent>

            <TabsContent value="timeline" className="m-0 h-full p-4">
              <WorkloadTimeline />
            </TabsContent>

            <TabsContent value="skills" className="m-0 h-full p-4">
              <SkillMatrix />
            </TabsContent>

            <TabsContent value="people" className="m-0 h-full p-4">
              <PeopleList />
            </TabsContent>

            <TabsContent value="scenarios" className="m-0 h-full p-4">
              <ScenarioManager />
            </TabsContent>
          </Tabs>
        </div>

        {showAssistant && (
          <div className="fixed right-0 top-14 h-[calc(100vh-3.5rem)] w-96 border-l bg-background">
            <BalancingAssistant onClose={() => setShowAssistant(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

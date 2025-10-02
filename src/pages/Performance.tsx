import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceMonitor } from "@/components/performance/PerformanceMonitor";
import { VirtualizedTaskList } from "@/components/performance/VirtualizedList";
import { DatabaseOptimizer } from "@/components/performance/DatabaseOptimizer";
import { Zap, List, Database } from "lucide-react";

export default function Performance() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Performance Center</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and optimize application performance
        </p>
      </div>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">
            <Zap className="h-4 w-4 mr-2" />
            Web Vitals
          </TabsTrigger>
          <TabsTrigger value="virtualization">
            <List className="h-4 w-4 mr-2" />
            Virtualization
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <PerformanceMonitor />
        </TabsContent>

        <TabsContent value="virtualization">
          <VirtualizedTaskList />
        </TabsContent>

        <TabsContent value="database">
          <DatabaseOptimizer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ListTodo, Calendar } from "lucide-react";
import { fetchBacklogItems, getBacklogStats } from "@/services/boards/backlogService";
import { getActiveSprint, getSprintMetrics } from "@/services/boards/sprintService";
import { SprintPanel } from "./SprintPanel";
import { BacklogCard } from "./BacklogCard";

export function BacklogPanel() {
  const { project } = useProject();
  const [activeTab, setActiveTab] = useState("backlog");
  const [backlogItems, setBacklogItems] = useState<any[]>([]);
  const [backlogStats, setBacklogStats] = useState<any>(null);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [sprintMetrics, setSprintMetrics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBacklogData();
    loadSprintData();
  }, [project.id]);

  async function loadBacklogData() {
    setIsLoading(true);
    const items = await fetchBacklogItems(project.id);
    const stats = await getBacklogStats(project.id);
    setBacklogItems(items);
    setBacklogStats(stats);
    setIsLoading(false);
  }

  async function loadSprintData() {
    const sprint = await getActiveSprint(project.id);
    setActiveSprint(sprint);
    
    if (sprint) {
      const metrics = await getSprintMetrics(sprint.id);
      setSprintMetrics(metrics);
    }
  }

  const filteredItems = backlogItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background border-r">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="p-4 border-b space-y-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backlog" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Backlog
            </TabsTrigger>
            <TabsTrigger value="sprint" className="gap-2">
              <Calendar className="h-4 w-4" />
              Sprint
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="backlog" className="flex-1 m-0 flex flex-col">
          <div className="p-4 space-y-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search backlog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {backlogStats && (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">
                  {backlogStats.totalItems} items
                </Badge>
                <Badge variant="secondary">
                  {backlogStats.totalPoints} pts
                </Badge>
                {backlogStats.totalHours > 0 && (
                  <Badge variant="secondary">
                    {backlogStats.totalHours}h
                  </Badge>
                )}
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading backlog...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No items match your search' : 'No items in backlog'}
                </div>
              ) : (
                filteredItems.map((item) => (
                  <BacklogCard
                    key={item.id}
                    task={item}
                    onRefresh={loadBacklogData}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sprint" className="flex-1 m-0 flex flex-col">
          <SprintPanel
            projectId={project.id}
            activeSprint={activeSprint}
            sprintMetrics={sprintMetrics}
            onSprintChange={loadSprintData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

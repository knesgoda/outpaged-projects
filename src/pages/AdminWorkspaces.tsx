import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceManager } from "@/components/workspaces/WorkspaceManager";
import { SpaceManager } from "@/components/workspaces/SpaceManager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminWorkspaces() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Workspace Management</h1>
        <p className="text-muted-foreground">
          Manage organization workspaces and spaces
        </p>
      </div>

      <Tabs defaultValue="workspaces" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="spaces">Spaces</TabsTrigger>
        </TabsList>

        <TabsContent value="workspaces" className="space-y-6">
          <WorkspaceManager />
        </TabsContent>

        <TabsContent value="spaces" className="space-y-6">
          {workspaces && workspaces.length > 0 ? (
            <>
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Select Workspace:</label>
                <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Choose a workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedWorkspace && <SpaceManager workspaceId={selectedWorkspace} />}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Create a workspace first to manage spaces
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
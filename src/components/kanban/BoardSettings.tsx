
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Layers, Columns } from "lucide-react";
import { SwimlanesManager } from "./SwimlanesManager";
import { ColumnManager } from "./ColumnManager";

interface Swimlane {
  id: string;
  name: string;
  position: number;
  color: string;
  is_default: boolean;
  project_id: string;
}

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color: string;
  wip_limit?: number;
  is_default: boolean;
  project_id: string;
}

interface BoardSettingsProps {
  projectId: string;
  onUpdate: () => void;
}

export function BoardSettings({ projectId, onUpdate }: BoardSettingsProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>([]);
  const [columns, setColumns] = useState<KanbanColumnData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBoardConfiguration = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      // Fetch swimlanes
      const { data: swimlanesData, error: swimlanesError } = await supabase
        .from('swimlanes')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (swimlanesError) throw swimlanesError;

      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (columnsError) throw columnsError;

      setSwimlanes(swimlanesData || []);
      setColumns(columnsData || []);
    } catch (error) {
      console.error('Error fetching board configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load board configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchBoardConfiguration();
    }
  }, [isOpen, projectId]);

  const handleUpdate = () => {
    fetchBoardConfiguration();
    onUpdate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Board Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Board Configuration</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="columns" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="columns" className="flex items-center gap-2">
              <Columns className="w-4 h-4" />
              Columns
            </TabsTrigger>
            <TabsTrigger value="swimlanes" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Swimlanes
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="columns" className="mt-6">
            <ColumnManager
              projectId={projectId}
              columns={columns}
              onUpdate={handleUpdate}
            />
          </TabsContent>
          
          <TabsContent value="swimlanes" className="mt-6">
            <SwimlanesManager
              projectId={projectId}
              swimlanes={swimlanes}
              onUpdate={handleUpdate}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

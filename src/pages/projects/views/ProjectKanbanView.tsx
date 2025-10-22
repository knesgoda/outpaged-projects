import { useParams } from "react-router-dom";
import { useIsMobile } from "@/features/boards/mobile";
import { MobileKanbanView } from "@/features/boards/mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureProjectBoard } from "@/services/projects/boardInitializer";
import { Loader2 } from "lucide-react";
import { BoardViewCanvas } from "@/features/boards/views";
import { BoardViewProvider } from "@/features/boards/views/context";
import { BoardStateProvider } from "@/features/boards/views/BoardStateProvider";
import type { BoardViewRecord } from "@/features/boards/views";
import type { BoardViewConfiguration } from "@/types/boards";

export default function ProjectKanbanView() {
  const { projectId } = useParams<{ projectId: string }>();
  const isMobile = useIsMobile();

  const { data: boardId, isLoading } = useQuery({
    queryKey: ["project-board", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID required");

      const { data: project } = await supabase
        .from("projects")
        .select("default_board_id")
        .eq("id", projectId)
        .single();

      if (project?.default_board_id) {
        return project.default_board_id;
      }

      return await ensureProjectBoard(projectId);
    },
    enabled: !!projectId,
  });

  // Fetch tasks for the board
  const { data: boardData, isLoading: tasksLoading } = useQuery({
    queryKey: ["project-board-kanban", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID required");

      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      return { tasks: (tasks || []) as BoardViewRecord[] };
    },
    enabled: !!projectId && !!boardId,
  });

  if (isLoading || tasksLoading || !boardId || !projectId || !boardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const configuration: BoardViewConfiguration = {
    mode: "kanban",
    filters: {},
    grouping: { primary: null, swimlaneField: null, swimlanes: [] },
    sort: [],
    columnPreferences: { order: [], hidden: [] },
  };

  if (isMobile) {
    return (
      <div className="h-full">
        <BoardStateProvider>
          <BoardViewProvider
            items={boardData.tasks}
            configuration={configuration}
            isLoading={false}
          >
            <MobileKanbanView boardId={boardId} />
          </BoardViewProvider>
        </BoardStateProvider>
      </div>
    );
  }

  return (
    <div className="h-full">
      <BoardViewCanvas
        items={boardData.tasks}
        configuration={configuration}
        isLoading={false}
      />
    </div>
  );
}

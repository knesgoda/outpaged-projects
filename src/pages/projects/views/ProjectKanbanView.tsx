import { useParams } from "react-router-dom";
import { useIsMobile } from "@/features/boards/mobile";
import { MobileKanbanView } from "@/features/boards/mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureProjectBoard } from "@/services/projects/boardInitializer";
import { Loader2 } from "lucide-react";
import KanbanBoard from "@/pages/KanbanBoard";
import { BoardViewProvider } from "@/features/boards/views/context";
import { BoardStateProvider } from "@/features/boards/views/BoardStateProvider";
import type { BoardViewRecord } from "@/features/boards/views";

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

  // Fetch tasks for mobile view - must be called unconditionally
  const { data: tasks } = useQuery({
    queryKey: ["project-tasks-mobile", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      return (data || []) as BoardViewRecord[];
    },
    enabled: !!projectId,
  });

  if (isLoading || !boardId || !projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <BoardStateProvider>
        <BoardViewProvider
          items={tasks || []}
          configuration={{
            mode: "kanban",
            filters: {},
            grouping: { primary: null, swimlaneField: null, swimlanes: [] },
            sort: [],
            columnPreferences: { order: [], hidden: [] },
          }}
          isLoading={!tasks}
        >
          <MobileKanbanView boardId={boardId} />
        </BoardViewProvider>
      </BoardStateProvider>
    );
  }

  return <KanbanBoard />;
}

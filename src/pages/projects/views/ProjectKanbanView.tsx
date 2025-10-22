import { useIsMobile } from "@/features/boards/mobile";
import { MobileKanbanView } from "@/features/boards/mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureProjectBoard } from "@/services/projects/boardInitializer";
import { BoardViewCanvas } from "@/features/boards/views";
import { BoardViewProvider } from "@/features/boards/views/context";
import { BoardStateProvider } from "@/features/boards/views/BoardStateProvider";
import { ErrorBoundary } from "@/components/boards/ErrorBoundary";
import { LoadingState } from "@/components/boards/LoadingState";
import type { BoardViewRecord } from "@/features/boards/views";
import type { BoardViewConfiguration } from "@/types/boards";
import type { Database } from "@/integrations/supabase/types";
import { useProject } from "@/contexts/ProjectContext";

type KanbanColumnRow = Database["public"]["Tables"]["kanban_columns"]["Row"];

export default function ProjectKanbanView() {
  const { project } = useProject();
  const isMobile = useIsMobile();

  const { data: boardId, isLoading } = useQuery({
    queryKey: ["project-board", project.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("default_board_id")
        .eq("id", project.id)
        .single();

      if (data?.default_board_id) {
        return data.default_board_id;
      }

      return await ensureProjectBoard(project.id);
    },
  });

  // Fetch tasks for the board
  const { data: boardData, isLoading: tasksLoading } = useQuery({
    queryKey: ["project-board-kanban", project.id],
    queryFn: async () => {
      const [tasksResult, columnsResult] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("kanban_columns")
          .select("*")
          .eq("project_id", project.id)
          .order("position", { ascending: true }),
      ]);

      return {
        tasks: (tasksResult.data || []) as BoardViewRecord[],
        columns: (columnsResult.data || []) as KanbanColumnRow[],
      };
    },
    enabled: !!boardId,
  });

  if (isLoading || tasksLoading || !boardId || !boardData) {
    return <LoadingState type="cards" count={8} message="Loading kanban board..." />;
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
      <ErrorBoundary>
        <div className="h-full">
          <BoardStateProvider>
            <BoardViewProvider
              items={boardData.tasks}
              configuration={configuration}
              isLoading={false}
              columns={boardData.columns}
            >
              <MobileKanbanView boardId={boardId} />
            </BoardViewProvider>
          </BoardStateProvider>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-full">
        <BoardViewCanvas
          items={boardData.tasks}
          configuration={configuration}
          isLoading={false}
          columns={boardData.columns}
        />
      </div>
    </ErrorBoundary>
  );
}

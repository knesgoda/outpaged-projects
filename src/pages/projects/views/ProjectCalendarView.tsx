import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureProjectBoard } from "@/services/projects/boardInitializer";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/features/boards/mobile";
import { MobileCalendarBoardView } from "@/features/boards/mobile";
import { BoardViewCanvas } from "@/features/boards/views";
import { BoardViewProvider } from "@/features/boards/views/context";
import { BoardStateProvider } from "@/features/boards/views/BoardStateProvider";
import type { BoardViewConfiguration } from "@/types/boards";
import type { BoardViewRecord } from "@/features/boards/views";
import { useProject } from "@/contexts/ProjectContext";

export default function ProjectCalendarView() {
  const { project } = useProject();
  const isMobile = useIsMobile();

  const { data: boardData, isLoading } = useQuery({
    queryKey: ["project-board-calendar", project.id],
    queryFn: async () => {
      const { data: projectData } = await supabase
        .from("projects")
        .select("default_board_id")
        .eq("id", project.id)
        .single();

      const boardId = projectData?.default_board_id || await ensureProjectBoard(project.id);

      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project.id)
        .order("due_date", { ascending: true });

      return { boardId, tasks: (tasks || []) as BoardViewRecord[] };
    },
  });

  if (isLoading || !boardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const configuration: BoardViewConfiguration = {
    mode: "calendar",
    filters: {},
    grouping: { primary: null, swimlaneField: null, swimlanes: [] },
    sort: [],
    columnPreferences: { order: [], hidden: [] },
  };

  if (isMobile) {
    return (
      <div className="p-4">
        <BoardStateProvider>
          <BoardViewProvider
            items={boardData.tasks}
            configuration={configuration}
            isLoading={false}
          >
            <MobileCalendarBoardView />
          </BoardViewProvider>
        </BoardStateProvider>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <BoardViewCanvas
        items={boardData.tasks}
        configuration={configuration}
        isLoading={false}
      />
    </div>
  );
}

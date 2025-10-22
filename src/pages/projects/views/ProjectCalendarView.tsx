import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureProjectBoard } from "@/services/projects/boardInitializer";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/features/boards/mobile";
import { MobileCalendarBoardView } from "@/features/boards/mobile";
import { BoardViewCanvas } from "@/features/boards/views";
import type { BoardViewConfiguration } from "@/types/boards";
import type { BoardViewRecord } from "@/features/boards/views";

export default function ProjectCalendarView() {
  const { projectId } = useParams<{ projectId: string }>();
  const isMobile = useIsMobile();

  const { data: boardData, isLoading } = useQuery({
    queryKey: ["project-board-calendar", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID required");

      const { data: project } = await supabase
        .from("projects")
        .select("default_board_id")
        .eq("id", projectId)
        .single();

      const boardId = project?.default_board_id || await ensureProjectBoard(projectId);

      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date", { ascending: true });

      return { boardId, tasks: (tasks || []) as BoardViewRecord[] };
    },
    enabled: !!projectId,
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

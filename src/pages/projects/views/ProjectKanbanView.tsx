import { useParams } from "react-router-dom";
import { useIsMobile } from "@/features/boards/mobile";
import { MobileKanbanView } from "@/features/boards/mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureProjectBoard } from "@/services/projects/boardInitializer";
import { Loader2 } from "lucide-react";
import KanbanBoard from "@/pages/KanbanBoard";

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

  if (isLoading || !boardId || !projectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isMobile) {
    return <MobileKanbanView boardId={boardId} />;
  }

  return <KanbanBoard />;
}

import { supabase } from "@/integrations/supabase/client";

export async function ensureProjectBoard(projectId: string): Promise<string> {
  try {
    // Check if project already has a board
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("default_board_id, name, workspace_id, owner_id")
      .eq("id", projectId)
      .single();

    if (projectError) throw projectError;

    // If board exists, return it
    if (project.default_board_id) {
      return project.default_board_id;
    }

    // Create a new board for the project
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .insert({
        name: `${project.name} Board`,
        description: `Default board for ${project.name}`,
        type: "container",
        project_id: projectId,
        workspace_id: project.workspace_id,
        created_by: project.owner_id,
      })
      .select()
      .single();

    if (boardError) throw boardError;

    // Create default views
    const views = [
      { name: "Kanban", view_mode: "kanban", is_default: true, position: 0 },
      { name: "Table", view_mode: "table", is_default: false, position: 1 },
      { name: "Timeline", view_mode: "timeline", is_default: false, position: 2 },
      { name: "Calendar", view_mode: "calendar", is_default: false, position: 3 },
    ];

    const { error: viewsError } = await supabase
      .from("board_views")
      .insert(
        views.map((view) => ({
          ...view,
          board_id: board.id,
          created_by: project.owner_id,
        }))
      );

    if (viewsError) throw viewsError;

    // Update project with the new board
    const { error: updateError } = await supabase
      .from("projects")
      .update({ default_board_id: board.id })
      .eq("id", projectId);

    if (updateError) throw updateError;

    return board.id;
  } catch (error) {
    console.error("Error ensuring project board:", error);
    throw error;
  }
}

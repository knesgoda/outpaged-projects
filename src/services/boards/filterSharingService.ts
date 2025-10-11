import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseError } from "@/services/errors";

export type FilterVisibility = "private" | "workspace" | "public";

export interface BoardFilterShare {
  id: string;
  boardId: string;
  viewId: string;
  userId: string;
  createdAt: string;
  canEdit: boolean;
  visibility: FilterVisibility;
}

interface BoardFilterShareInsert {
  board_id: string;
  view_id: string;
  user_id: string;
  can_edit?: boolean;
  visibility?: FilterVisibility;
}

const TABLE = "board_filter_shares";

type Row = BoardFilterShareInsert & { id: string; created_at: string; visibility: FilterVisibility; can_edit: boolean };

function mapRow(row: Row): BoardFilterShare {
  return {
    id: row.id,
    boardId: row.board_id,
    viewId: row.view_id,
    userId: row.user_id,
    createdAt: row.created_at,
    canEdit: row.can_edit,
    visibility: row.visibility,
  };
}

export async function listBoardFilterShares(boardId: string, viewId: string): Promise<BoardFilterShare[]> {
  const { data, error } = await supabase
    .from<Row>(TABLE)
    .select("*")
    .eq("board_id", boardId)
    .eq("view_id", viewId);

  if (error) {
    throw mapSupabaseError(error, "Unable to load filter sharing settings.");
  }

  return (data ?? []).map(mapRow);
}

export async function addBoardFilterShare(
  boardId: string,
  viewId: string,
  userId: string,
  options: { canEdit?: boolean; visibility?: FilterVisibility } = {}
): Promise<BoardFilterShare> {
  const payload: BoardFilterShareInsert = {
    board_id: boardId,
    view_id: viewId,
    user_id: userId,
    can_edit: options.canEdit ?? false,
    visibility: options.visibility ?? "private",
  };

  const { data, error } = await supabase.from<Row>(TABLE).insert(payload).select("*").single();

  if (error || !data) {
    throw mapSupabaseError(error, "Unable to share board filters.");
  }

  return mapRow(data);
}

export async function removeBoardFilterShare(shareId: string): Promise<void> {
  const { error } = await supabase.from<Row>(TABLE).delete().eq("id", shareId);

  if (error) {
    throw mapSupabaseError(error, "Unable to revoke board filter access.");
  }
}

export async function updateBoardFilterVisibility(
  boardId: string,
  viewId: string,
  visibility: FilterVisibility
): Promise<void> {
  const { error } = await supabase
    .from<Row>(TABLE)
    .update({ visibility })
    .eq("board_id", boardId)
    .eq("view_id", viewId);

  if (error) {
    throw mapSupabaseError(error, "Unable to update filter visibility.");
  }
}

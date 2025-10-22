import { supabase } from "@/integrations/supabase/client";

export type BoardMode = 'kanban' | 'scrum';

export interface BoardConfig {
  id: string;
  mode: BoardMode;
  project_id?: string;
}

export const boardConfigService = {
  async getBoardMode(boardId: string): Promise<BoardMode> {
    const { data, error } = await supabase
      .from('boards')
      .select('mode')
      .eq('id', boardId)
      .single();

    if (error) throw error;
    return (data?.mode as BoardMode) || 'kanban';
  },

  async updateBoardMode(boardId: string, mode: BoardMode): Promise<void> {
    const { error } = await supabase
      .from('boards')
      .update({ mode })
      .eq('id', boardId);

    if (error) throw error;
  },

  async getBoardConfig(boardId: string): Promise<BoardConfig | null> {
    const { data, error } = await supabase
      .from('boards')
      .select('id, mode, project_id')
      .eq('id', boardId)
      .single();

    if (error) throw error;
    return data as BoardConfig;
  },
};

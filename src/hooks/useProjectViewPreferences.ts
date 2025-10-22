import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BoardViewMode } from "@/types/boards";

interface ViewPreferences {
  id: string;
  user_id: string;
  project_id: string;
  default_view_mode: BoardViewMode;
  view_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useProjectViewPreferences(projectId: string) {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["project-view-preferences", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_project_view_preferences")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data as ViewPreferences | null;
    },
    enabled: !!projectId,
  });

  const setDefaultViewMutation = useMutation({
    mutationFn: async (viewMode: BoardViewMode) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_project_view_preferences")
        .upsert(
          {
            user_id: user.id,
            project_id: projectId,
            default_view_mode: viewMode,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,project_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-view-preferences", projectId],
      });
    },
  });

  const updateViewSettingsMutation = useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_project_view_preferences")
        .update({ view_settings: settings as any, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("project_id", projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-view-preferences", projectId],
      });
    },
  });

  return {
    defaultView: (preferences?.default_view_mode as BoardViewMode) || "kanban",
    viewSettings: preferences?.view_settings || {},
    setDefaultView: setDefaultViewMutation.mutateAsync,
    updateViewSettings: updateViewSettingsMutation.mutateAsync,
    isLoading,
  };
}

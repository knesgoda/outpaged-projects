
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectMemberProfile {
  project_id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function useProjectMembersView(projectId?: string) {
  const query = useQuery({
    queryKey: ["project-members-with-profiles", projectId],
    queryFn: async (): Promise<ProjectMemberProfile[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_members_with_profiles")
        .select("*")
        .eq("project_id", projectId)
        .order("full_name", { ascending: true });

      if (error) throw error;
      return (data || []) as ProjectMemberProfile[];
    },
    enabled: !!projectId,
  });

  return {
    members: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

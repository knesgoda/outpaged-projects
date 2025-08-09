
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectMember {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  initials: string;
}

export function useProjectMembers(projectId?: string) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!projectId) return;
      setLoading(true);
      console.log("[useProjectMembers] Fetching members for project:", projectId);

      // Requires FK project_members.user_id -> profiles.user_id (added in migration)
      const { data, error } = await supabase
        .from("project_members")
        .select(`
          user_id,
          profiles:profiles (
            full_name,
            avatar_url
          )
        `)
        .eq("project_id", projectId);

      if (error) {
        console.error("[useProjectMembers] Error:", error);
        setMembers([]);
        setLoading(false);
        return;
      }

      const mapped =
        (data || []).map((row: any) => {
          const name = row.profiles?.full_name || "Unknown User";
          const initials = name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          return {
            user_id: row.user_id,
            full_name: name,
            avatar_url: row.profiles?.avatar_url || null,
            initials,
          } as ProjectMember;
        }) ?? [];

      setMembers(mapped);
      setLoading(false);
    };

    fetchMembers();
  }, [projectId]);

  return { members, loading };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  username?: string | null;
}

export function useCompanyDirectory(search: string, limit = 20) {
  return useQuery<{ users: CompanyUser[] }>({
    queryKey: ["company-directory", search, limit],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, username")
        .order("full_name", { ascending: true })
        .limit(limit);

      if (search && search.trim().length > 0) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `full_name.ilike.${term},username.ilike.${term}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return { users: (data || []) as CompanyUser[] };
    },
  });
}

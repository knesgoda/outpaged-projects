import { useQuery } from "@tanstack/react-query";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ProjectOption = {
  id: string;
  name: string | null;
};

async function fetchProjects(): Promise<ProjectOption[]> {
  if (!supabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function useProjectsLite() {
  const { toast } = useToast();

  return useQuery<ProjectOption[], Error>({
    queryKey: ["projects-lite"],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      toast({
        title: "Failed to load projects",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

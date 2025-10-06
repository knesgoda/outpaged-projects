import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GoalCreate from "@/pages/goals/GoalCreate";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProjectGoalCreate() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project, error, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error: queryError } = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();
      if (queryError) throw queryError;
      return data as { id: string; name: string | null } | null;
    },
    enabled: Boolean(projectId),
  });

  useEffect(() => {
    if (projectId) {
      document.title = project?.name
        ? `Projects / ${project.name} / Goals / New`
        : `Projects / ${projectId} / Goals / New`;
    }
  }, [project?.name, projectId]);

  if (!projectId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Project not found.</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Alert>
        <AlertDescription>Loading project details...</AlertDescription>
      </Alert>
    );
  }

  return <GoalCreate projectId={projectId} projectName={project?.name ?? undefined} />;
}

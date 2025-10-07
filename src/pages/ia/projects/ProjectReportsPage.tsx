import { useParams } from "react-router-dom";
import { ReportsHomeView } from "@/pages/reports/ReportsHome";
import { useProjectSummary } from "@/hooks/useProjectOptions";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const summary = useProjectSummary(projectId);

  if (!projectId) {
    return (
      <section className="p-6">
        <p className="text-sm text-muted-foreground">Project not specified.</p>
      </section>
    );
  }

  if (summary.isLoading && !summary.data) {
    return (
      <section className="space-y-4 p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-32 w-full" />
      </section>
    );
  }

  if (summary.isError) {
    const message =
      summary.error instanceof Error
        ? summary.error.message
        : "Unable to load project.";
    return (
      <section className="p-6">
        <p className="text-sm text-destructive">{message}</p>
      </section>
    );
  }

  return (
    <ReportsHomeView
      forcedProjectId={projectId}
      forcedProjectName={summary.data?.name ?? null}
    />
  );
}

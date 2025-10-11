import { ProjectPageTemplate, type ProjectSummary } from "./ProjectPageTemplate";
import { ProjectAnalyticsDashboard } from "@/features/projects/analytics/ProjectAnalyticsDashboard";

export default function ProjectOverviewPage() {
  return (
    <ProjectPageTemplate
      title="Overview"
      description="Program-level health, automations, and SLA outcomes for this project."
    >
      {({ projectId, project, isLoading }) => (
        <OverviewContent projectId={projectId} project={project} isProjectLoading={isLoading} />
      )}
    </ProjectPageTemplate>
  );
}

function OverviewContent({
  projectId,
  project,
  isProjectLoading,
}: {
  projectId: string;
  project: ProjectSummary | null;
  isProjectLoading: boolean;
}) {
  if (!projectId) {
    return <p className="text-sm text-muted-foreground">Select a project to load analytics.</p>;
  }

  return (
    <ProjectAnalyticsDashboard projectId={projectId} project={project} isProjectLoading={isProjectLoading} />
  );
}

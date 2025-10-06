import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageTemplate } from "../ia/PageTemplate";
import { WorkloadDashboard } from "@/components/workload/WorkloadDashboard";
import { getProject } from "@/services/projects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ProjectWorkloadPage() {
  const { projectId } = useParams();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => (projectId ? getProject(projectId) : Promise.resolve(null)),
    enabled: Boolean(projectId),
  });

  const projectName = projectQuery.data?.name ?? projectId ?? "Project";

  useEffect(() => {
    document.title = `${projectName} • Workload`;
  }, [projectName]);

  if (!projectId) {
    return (
      <PageTemplate
        title="Project Workload"
        description="Select a project to review team capacity."
      >
        <Alert variant="destructive">
          <AlertTitle>Missing project</AlertTitle>
          <AlertDescription>Navigate from a project to view its workload.</AlertDescription>
        </Alert>
      </PageTemplate>
    );
  }

  const description = `Balance work across the team for ${projectName}.`;

  return (
    <PageTemplate title={`${projectName} workload`} description={description}>
      {projectQuery.isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Unable to load project details</AlertTitle>
          <AlertDescription>We could not fetch metadata for this project, but workload data may still load.</AlertDescription>
        </Alert>
      )}
      <WorkloadDashboard
        initialProjectId={projectId}
        allowProjectSelection={false}
        lockedProjectName={projectName}
      />
    </PageTemplate>
  );
}

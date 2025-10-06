import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { FilesView } from "@/pages/files/FilesPage";
import { useProjectSummary } from "@/hooks/useProjectsLite";

export default function ProjectFilesPage() {
  const params = useParams<{ projectId?: string; id?: string }>();
  const projectId = params.projectId ?? params.id ?? "";
  const { data: project } = useProjectSummary(projectId);

  const projectLabel = project?.name?.trim() || projectId || "Project";

  const breadcrumbs = useMemo(
    () => [
      { label: "Projects", href: "/projects" },
      {
        label: projectLabel,
        href: projectId ? `/projects/${projectId}` : "/projects",
      },
      {
        label: "Files",
        href: projectId ? `/projects/${projectId}/files` : undefined,
      },
    ],
    [projectId, projectLabel]
  );

  const description = project?.name ? `Files for ${project.name}` : "Project files";

  return (
    <FilesView
      heading="Files"
      description={description}
      breadcrumbs={breadcrumbs}
      documentTitle={`Projects / ${projectLabel} / Files | Outpaged`}
      fixedProjectId={projectId || undefined}
    />
  );
}

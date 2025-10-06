import { useMemo } from "react";
import { FilesView } from "@/pages/files/FilesPage";
import { useProjectSummary } from "@/hooks/useProjectsLite";
import { useProjectId } from "@/hooks/useProjectId";

export default function ProjectFilesPage() {
  const projectId = useProjectId() ?? "";
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

import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCommandK } from "@/components/command/useCommandK";
import { ProjectPageTemplate } from "./ProjectPageTemplate";

export default function ProjectFilesPage() {
  const { projectId } = useParams();
  const { openPalette } = useCommandK();

  return (
    <ProjectPageTemplate
      title="Files"
      description="Browse and manage project assets with approvals and version history."
      headerExtras={
        projectId ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openPalette({ projectId, types: ["file"] })}
          >
            Search files
          </Button>
        ) : null
      }
    />
  );
}

import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCommandK } from "@/components/command/useCommandK";
import { ProjectPageTemplate } from "./ProjectPageTemplate";

export default function ProjectDocsPage() {
  const { projectId } = useParams();
  const { openPalette } = useCommandK();

  return (
    <ProjectPageTemplate
      title="Docs"
      description="Capture project knowledge, briefs, and decisions in one place."
      headerExtras={
        projectId ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openPalette({ projectId, types: ["doc"] })}
          >
            Search docs
          </Button>
        ) : null
      }
    />
  );
}

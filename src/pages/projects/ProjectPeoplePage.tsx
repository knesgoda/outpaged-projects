import { useParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ProjectPeoplePage() {
  const { projectId = "" } = useParams();
  useDocumentTitle(`Projects / ${projectId || "Project"} / People`);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Project People</h1>
        <p className="text-sm text-muted-foreground">Member assignments will display for project {projectId || "soon"}.</p>
      </header>
      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 w-full animate-pulse rounded-md bg-muted/50" aria-hidden="true" />
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Use this area to review project members once the service is connected.
        </p>
      </div>
    </section>
  );
}

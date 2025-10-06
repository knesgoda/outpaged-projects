import { useParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ProjectTeamsPage() {
  const { projectId = "" } = useParams();
  useDocumentTitle(`Projects / ${projectId || "Project"} / Teams`);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Project Teams</h1>
        <p className="text-sm text-muted-foreground">Linked teams will appear for project {projectId || "soon"}.</p>
      </header>
      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 w-full animate-pulse rounded-md bg-muted/50" aria-hidden="true" />
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          We will show shared ownership and staffing once the backend is ready.
        </p>
      </div>
    </section>
  );
}

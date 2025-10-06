import { useProjectId } from "@/hooks/useProjectId";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ProjectTimePage() {
  const projectId = useProjectId() ?? "";
  useDocumentTitle(`Projects / ${projectId || "Project"} / Time`);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Project Time</h1>
        <p className="text-sm text-muted-foreground">Time summaries will load for project {projectId || "soon"}.</p>
      </header>
      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-24 w-full animate-pulse rounded-md bg-muted/40" aria-hidden="true" />
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Detailed hours by person and day will appear once tracking is wired.
        </p>
      </div>
    </section>
  );
}

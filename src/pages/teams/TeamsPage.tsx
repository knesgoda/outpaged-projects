import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function TeamsPage() {
  useDocumentTitle("Teams");

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="text-sm text-muted-foreground">Team lists will be ready shortly.</p>
      </header>
      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 w-full animate-pulse rounded-md bg-muted/60" aria-hidden="true" />
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          We are setting up team management and member workflows.
        </p>
      </div>
    </section>
  );
}

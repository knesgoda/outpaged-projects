import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function PeoplePage() {
  useDocumentTitle("People");

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="text-sm text-muted-foreground">Directory coming soon.</p>
      </header>
      <div className="space-y-3 rounded-lg border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-10 w-full animate-pulse rounded-md bg-muted/60"
              aria-hidden="true"
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          We are preparing the unified directory for people and teams.
        </p>
      </div>
    </section>
  );
}

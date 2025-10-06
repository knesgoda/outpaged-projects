import { useParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function TeamDetailPage() {
  const { teamId = "" } = useParams();
  useDocumentTitle(`Teams / ${teamId || "Team"}`);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">Member and project details are coming soon.</p>
      </header>
      <div className="space-y-4 rounded-lg border bg-background p-6 shadow-sm">
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted/60" aria-hidden="true" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted/50" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 w-full animate-pulse rounded-md bg-muted/50" aria-hidden="true" />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          We will surface team {teamId || "details"} with members and linked projects here.
        </p>
      </div>
    </section>
  );
}

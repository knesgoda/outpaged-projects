import { PageTemplate } from "./PageTemplate";

export default function HomePage() {
  return (
    <PageTemplate
      title="Home"
      description="Your personalized snapshot of projects, updates, and priorities across the workspace."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Review critical work and plan your day at a glance.
          </p>
        </div>
        <div className="rounded-lg border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Track updates from boards, tasks, and teammates.
          </p>
        </div>
        <div className="rounded-lg border bg-background p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming milestones</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor the next deliverables across your projects.
          </p>
        </div>
      </div>
    </PageTemplate>
  );
}

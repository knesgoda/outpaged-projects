import { PageTemplate } from "./PageTemplate";

export default function HelpPage() {
  return (
    <PageTemplate
      title="Help"
      description="Access documentation, keyboard shortcuts, and support resources."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-background p-4">
          <h2 className="text-base font-semibold">Documentation</h2>
          <p className="mt-2 text-sm text-muted-foreground">Deep dives, onboarding guides, and best practices.</p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <h2 className="text-base font-semibold">Shortcuts</h2>
          <p className="mt-2 text-sm text-muted-foreground">Learn power moves to navigate faster.</p>
        </div>
      </div>
    </PageTemplate>
  );
}

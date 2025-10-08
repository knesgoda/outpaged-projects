import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/outpaged/StatusChip";

const ADMIN_CARDS = [
  {
    title: "Teams",
    description: "Design • Mobile Dev • Backend Dev • AI • Operations",
    body: (
      <div className="flex flex-wrap gap-2 text-sm text-[hsl(var(--muted-foreground))]">
        {["Design", "Mobile Dev", "Backend Dev", "AI", "Operations"].map((team) => (
          <StatusChip key={team} variant="neutral">
            {team}
          </StatusChip>
        ))}
      </div>
    ),
  },
  {
    title: "Single Sign-On",
    description: "outpaged.com",
    body: (
      <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
        <p>Google Workspace enforced</p>
        <StatusChip variant="accent">All users</StatusChip>
      </div>
    ),
  },
  {
    title: "Workflow Library",
    description: "A collection of predefined workflows",
    body: (
      <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
        <p>Design → Software handoff</p>
        <p>Marketing launch QA</p>
      </div>
    ),
  },
  {
    title: "Backups",
    description: "Nightly snapshots & exports",
    body: (
      <div className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
        <p>Last export: 2 hours ago</p>
        <StatusChip variant="success">Healthy</StatusChip>
      </div>
    ),
  },
] as const;

export function AdminConsoleShowcase() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="space-y-2 text-[hsl(var(--foreground))]">
        <StatusChip variant="accent">Admin</StatusChip>
        <h1 className="text-4xl font-semibold tracking-tight">Admin Console</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Teams &amp; Workflows</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {ADMIN_CARDS.map((card) => (
          <Card key={card.title} className="rounded-3xl border-none bg-[hsl(var(--card))]/95 shadow-soft">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold text-[hsl(var(--foreground))]">{card.title}</CardTitle>
              <CardDescription className="text-sm text-[hsl(var(--muted-foreground))]">
                {card.description}
              </CardDescription>
            </CardHeader>
            <CardContent>{card.body}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

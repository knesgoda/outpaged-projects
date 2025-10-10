import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useWorkspaceContext } from "@/state/workspace";

export default function SpaceOverviewPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { spaces, currentSpace, setSpace, loadingSpaces } = useWorkspaceContext();

  useEffect(() => {
    if (spaceId) {
      setSpace(spaceId);
    }
  }, [spaceId, setSpace]);

  const activeSpace = useMemo(() => {
    if (!spaceId) {
      return currentSpace;
    }
    return spaces.find((space) => space.id === spaceId || space.slug === spaceId) ?? currentSpace;
  }, [spaceId, spaces, currentSpace]);

  if (loadingSpaces) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Loading space…</span>
        </div>
      </div>
    );
  }

  if (!activeSpace) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">No space selected</h1>
        <p className="text-muted-foreground">
          Choose a space from the sidebar to see its summary, or create a new space to group related projects and boards.
        </p>
      </div>
    );
  }

  const metaEntries = [
    { label: "Slug", value: activeSpace.slug || "—" },
    { label: "Type", value: activeSpace.space_type ? activeSpace.space_type.replace(/_/g, " ") : "General" },
    { label: "Order", value: activeSpace.position != null ? `#${activeSpace.position}` : "Not prioritized" },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{activeSpace.name}</h1>
          <Badge variant="secondary">Space</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {activeSpace.description?.trim() || "Spaces group projects, boards, and automations for a single team or department."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Space details</CardTitle>
            <CardDescription>Key attributes that drive automation and defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {metaEntries.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{entry.label}</span>
                <span className="font-medium text-foreground">{entry.value}</span>
              </div>
            ))}
            <Separator />
            <p className="text-muted-foreground">
              Coming soon: assign space owners, connect integrations, and configure intake forms specific to this space.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>Build out this space with the tools your team needs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="space-y-2 list-disc pl-4">
              <li>Create or link projects that belong to this space.</li>
              <li>Set up boards, workflows, and automations scoped to your team.</li>
              <li>Invite collaborators and define default roles.</li>
            </ul>
            <Separator />
            <p>
              Use the automation builder and workflow designer to keep this space in sync with the rest of your organization.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

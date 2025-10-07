import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

export type DocVersionSummary = {
  version: number;
  created_at: string;
  created_by: string | null;
};

type VersionHistoryProps = {
  versions: DocVersionSummary[];
  onRestore?: (version: number) => void;
  isRestoring?: boolean;
  restoringVersion?: number | null;
};

export function VersionHistory({ versions, onRestore, isRestoring, restoringVersion }: VersionHistoryProps) {
  if (!versions.length) {
    return <p className="text-sm text-muted-foreground">No versions yet.</p>;
  }

  return (
    <div className="space-y-2">
      {versions.map((version) => (
        <div
          key={version.version}
          className="flex items-center justify-between rounded border border-border/60 px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">Version {version.version}</p>
            <p className="text-xs text-muted-foreground">
              Saved {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
              {version.created_by ? ` • ${version.created_by}` : ""}
            </p>
          </div>
          {onRestore ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRestore(version.version)}
              disabled={isRestoring && restoringVersion === version.version}
            >
              Restore
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

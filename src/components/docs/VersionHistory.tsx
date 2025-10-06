import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
interface VersionHistoryProps {
  versions: Array<{ version: number; created_at: string; created_by: string | null }>;
  onRestore?: (version: number) => void;
  className?: string;
}

export function VersionHistory({ versions, onRestore, className }: VersionHistoryProps) {
  if (!versions.length) {
    return (
      <div className={`rounded border border-dashed p-4 text-center text-sm text-muted-foreground ${className ?? ""}`}>
        No versions yet.
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {versions.map((version) => (
        <div
          key={version.version}
          className="flex items-center justify-between rounded border px-3 py-2 text-sm"
        >
          <div>
            <div className="font-medium">Version {version.version}</div>
            <div className="text-xs text-muted-foreground">
              Saved {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
              {version.created_by ? ` · ${version.created_by}` : ""}
            </div>
          </div>
          {onRestore && (
            <Button size="sm" variant="outline" onClick={() => onRestore(version.version)}>
              Restore
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

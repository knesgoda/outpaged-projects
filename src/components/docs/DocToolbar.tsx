import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DocPage } from "@/types";

type DocToolbarProps = {
  doc: DocPage;
  onEdit: () => void;
  onCreateChild: () => void;
  onMove?: () => void;
  onShowVersions: () => void;
  onDelete: () => void;
  onTogglePublish: (next: boolean) => void;
  disablePublishToggle?: boolean;
};

export function DocToolbar({
  doc,
  onEdit,
  onCreateChild,
  onMove,
  onShowVersions,
  onDelete,
  onTogglePublish,
  disablePublishToggle,
}: DocToolbarProps) {
  const switchId = `doc-published-${doc.id}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="default" size="sm" onClick={onEdit}>
        Edit
      </Button>
      <Button variant="outline" size="sm" onClick={onCreateChild}>
        New
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onMove}
        disabled={!onMove}
        title={!onMove ? "Move coming soon" : undefined}
      >
        Move
      </Button>
      <Button variant="outline" size="sm" onClick={onShowVersions}>
        Version history
      </Button>
      <Button variant="destructive" size="sm" onClick={onDelete}>
        Delete
      </Button>
      <div className="flex items-center gap-2 rounded border border-border/60 px-3 py-1">
        <Label htmlFor={switchId} className="text-xs text-muted-foreground">
          Published
        </Label>
        <Switch
          id={switchId}
          checked={doc.is_published}
          disabled={disablePublishToggle}
          onCheckedChange={(value) => onTogglePublish(value)}
        />
      </div>
    </div>
  );
}

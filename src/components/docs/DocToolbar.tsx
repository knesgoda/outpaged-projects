import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DocPage } from "@/types";
import { Edit, History, Link, Plus, Trash, FolderSymlink } from "lucide-react";

interface DocToolbarProps {
  doc?: DocPage | null;
  onCreate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  onShowVersions?: () => void;
  onCopyLink?: () => void;
  onTogglePublish?: (value: boolean) => void;
}

export function DocToolbar({
  doc,
  onCreate,
  onEdit,
  onDelete,
  onMove,
  onShowVersions,
  onCopyLink,
  onTogglePublish,
}: DocToolbarProps) {
  const isPublished = doc?.is_published ?? true;

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2">
        {onCreate && (
          <Button size="sm" onClick={onCreate}>
            <Plus className="mr-1 h-4 w-4" /> New doc
          </Button>
        )}
        {onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit className="mr-1 h-4 w-4" /> Edit
          </Button>
        )}
        {onMove && (
          <Button size="sm" variant="outline" onClick={onMove}>
            <FolderSymlink className="mr-1 h-4 w-4" /> Move
          </Button>
        )}
        {onShowVersions && (
          <Button size="sm" variant="outline" onClick={onShowVersions}>
            <History className="mr-1 h-4 w-4" /> Versions
          </Button>
        )}
        {onCopyLink && (
          <Button size="sm" variant="outline" onClick={onCopyLink}>
            <Link className="mr-1 h-4 w-4" /> Copy link
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash className="mr-1 h-4 w-4" /> Delete
          </Button>
        )}
        {onTogglePublish && (
          <div className="ml-auto flex items-center gap-2 rounded border px-3 py-1 text-xs">
            <span className="font-medium">Published</span>
            <Switch
              checked={isPublished}
              onCheckedChange={onTogglePublish}
              aria-label="Toggle publish"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

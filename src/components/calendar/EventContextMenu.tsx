import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface EventContextMenuProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDuplicate: () => void;
  onMoveCalendar: () => void;
  onLinkItem: () => void;
  onConvertMilestone: () => void;
  onShare: () => void;
  onExport: () => void;
  onCopyId: () => void;
  onDelete: () => void;
}

export function EventContextMenu({
  children,
  onEdit,
  onDuplicate,
  onMoveCalendar,
  onLinkItem,
  onConvertMilestone,
  onShare,
  onExport,
  onCopyId,
  onDelete,
}: EventContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={onEdit}>
          Edit
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={onDuplicate}>Duplicate</ContextMenuItem>
        <ContextMenuItem onSelect={onMoveCalendar}>Move to calendar…</ContextMenuItem>
        <ContextMenuItem onSelect={onLinkItem}>Link item…</ContextMenuItem>
        <ContextMenuItem onSelect={onConvertMilestone}>Convert to milestone</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onShare}>Share link</ContextMenuItem>
        <ContextMenuItem onSelect={onExport}>Export iCal</ContextMenuItem>
        <ContextMenuItem onSelect={onCopyId}>Copy event ID</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive" onSelect={onDelete}>
          Delete
          <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

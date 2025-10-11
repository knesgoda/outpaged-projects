import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MirrorColumnMetadata } from "@/types/boardColumns";
import { hydrateMirrorData } from "@/lib/boards/columnCalculations";
import type {
  ColumnConfiguratorProps,
  ColumnRendererProps,
} from "./types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const formatFieldList = (fields: string[]): string => fields.join(", ");

export function MirrorColumnRenderer({
  value,
  metadata,
  fallback,
}: ColumnRendererProps<MirrorColumnMetadata>) {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const fields = metadata.displayFields ?? [];
  if (!record || fields.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {fallback ?? "No mirrored data"}
      </span>
    );
  }

  const hydrated = hydrateMirrorData(record, metadata);

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-1 p-3">
        {fields.map((field) => (
          <div key={field} className="flex items-baseline gap-2 text-xs">
            <span className="font-medium text-muted-foreground">{field}</span>
            <span className="text-foreground">
              {hydrated[field] !== undefined && hydrated[field] !== null
                ? String(hydrated[field])
                : "—"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MirrorColumnConfigurator({
  metadata,
  onChange,
  disabled,
}: ColumnConfiguratorProps<"mirror">) {
  const displayFieldText = useMemo(
    () => formatFieldList(metadata.displayFields ?? []),
    [metadata.displayFields]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mirror-board">Source board id</Label>
        <Input
          id="mirror-board"
          value={metadata.sourceBoardId}
          onChange={(event) =>
            onChange({ ...metadata, sourceBoardId: event.target.value })
          }
          placeholder="board-uuid"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mirror-column">Source column id</Label>
        <Input
          id="mirror-column"
          value={metadata.sourceColumnId}
          onChange={(event) =>
            onChange({ ...metadata, sourceColumnId: event.target.value })
          }
          placeholder="column-uuid"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mirror-fields">Fields to display</Label>
        <Textarea
          id="mirror-fields"
          value={displayFieldText}
          onChange={(event) => {
            const fields = event.target.value
              .split(/[,\n]/)
              .map((field) => field.trim())
              .filter(Boolean);
            onChange({ ...metadata, displayFields: fields });
          }}
          placeholder="status, assignee"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Provide a comma-separated list of fields to surface from the linked
          record.
        </p>
      </div>
    </div>
  );
}

export interface MirrorColumnConfiguratorDialogProps {
  metadata: MirrorColumnMetadata;
  onChange: (metadata: MirrorColumnMetadata) => void;
  disabled?: boolean;
  triggerLabel?: string;
}

export function MirrorColumnConfiguratorDialog({
  metadata,
  onChange,
  disabled,
  triggerLabel = "Configure mirror",
}: MirrorColumnConfiguratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MirrorColumnMetadata>(metadata);

  useEffect(() => {
    if (!open) {
      setDraft(metadata);
    }
  }, [metadata, open]);

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleCancel = () => {
    setDraft(metadata);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setDraft(metadata);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg space-y-4">
        <DialogHeader>
          <DialogTitle>Mirror column settings</DialogTitle>
        </DialogHeader>
        <MirrorColumnConfigurator metadata={draft} onChange={setDraft} disabled={disabled} />
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel} type="button">
            Cancel
          </Button>
          <Button onClick={handleApply} type="button" disabled={disabled}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

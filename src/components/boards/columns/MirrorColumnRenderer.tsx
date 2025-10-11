import { useMemo } from "react";
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

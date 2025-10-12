import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ConnectColumnMetadata } from "@/types/boardColumns";
import type {
  ColumnConfiguratorProps,
  ColumnRendererProps,
} from "./types";

interface LinkedRecord {
  id: string;
  title: string;
  status?: string;
}

const normalizeConnections = (value: unknown): LinkedRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        if (typeof item === "string") {
          return { id: item, title: item };
        }
        return null;
      }

      const record = item as Partial<LinkedRecord> & { name?: string };
      const title = record.title ?? record.name ?? String(record.id ?? Math.random());
      return {
        id: String(record.id ?? Math.random()),
        title,
        status: record.status,
      };
    })
    .filter((value) => value !== null && value.id && value.title) as LinkedRecord[];
};

export function ConnectColumnRenderer({
  value,
  metadata,
  fallback,
}: ColumnRendererProps<ConnectColumnMetadata>) {
  const connections = normalizeConnections(value);

  if (connections.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {fallback ?? "No linked records"}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {connections.map((connection) => (
        <Badge key={connection.id} variant="secondary" className="text-xs">
          {connection.title ?? connection.id}
        </Badge>
      ))}
    </div>
  );
}

export function ConnectColumnConfigurator({
  metadata,
  onChange,
  disabled,
}: ColumnConfiguratorProps<"connect">) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="connect-board">Target board id</Label>
        <Input
          id="connect-board"
          value={metadata.targetBoardId}
          onChange={(event) =>
            onChange({ ...metadata, targetBoardId: event.target.value })
          }
          placeholder="board-uuid"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="connect-relationship">Relationship name</Label>
        <Input
          id="connect-relationship"
          value={metadata.relationshipName}
          onChange={(event) =>
            onChange({ ...metadata, relationshipName: event.target.value })
          }
          placeholder="Linked work"
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <div>
          <Label htmlFor="connect-multi" className="text-sm font-medium">
            Allow multiple records
          </Label>
          <p className="text-xs text-muted-foreground">
            Enable selection of more than one linked record per cell.
          </p>
        </div>
        <Switch
          id="connect-multi"
          checked={metadata.allowMultiple}
          onCheckedChange={(checked) =>
            onChange({ ...metadata, allowMultiple: checked })
          }
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <div>
          <Label htmlFor="connect-auto" className="text-sm font-medium">
            Create reciprocal link
          </Label>
          <p className="text-xs text-muted-foreground">
            Automatically create a linked record on the target board when
            connecting.
          </p>
        </div>
        <Switch
          id="connect-auto"
          checked={metadata.createLinkedRecord}
          onCheckedChange={(checked) =>
            onChange({ ...metadata, createLinkedRecord: checked })
          }
          disabled={disabled}
        />
      </div>
    </div>
  );
}

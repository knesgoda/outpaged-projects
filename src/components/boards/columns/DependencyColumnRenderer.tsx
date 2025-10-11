import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DependencyColumnMetadata } from "@/types/boardColumns";
import type {
  ColumnConfiguratorProps,
  ColumnRendererProps,
} from "./types";

interface DependencyRecord {
  id: string;
  title?: string;
  status?: string;
  blocked?: boolean;
}

const toDependencyList = (value: unknown): DependencyRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (item && typeof item === "object") {
        const maybeRecord = item as Partial<DependencyRecord> & {
          name?: string;
          label?: string;
        };
        return {
          id: String(maybeRecord.id ?? maybeRecord.title ?? maybeRecord.name ?? Math.random()),
          title:
            maybeRecord.title ?? maybeRecord.name ?? maybeRecord.label ?? undefined,
          status: maybeRecord.status ?? undefined,
          blocked:
            typeof maybeRecord.blocked === "boolean"
              ? maybeRecord.blocked
              : maybeRecord.status === "blocked",
        };
      }

      if (typeof item === "string") {
        return { id: item, title: item };
      }

      return null;
    })
    .filter((item): item is DependencyRecord => Boolean(item));
};

export function DependencyColumnRenderer({
  value,
  metadata,
  fallback,
}: ColumnRendererProps<DependencyColumnMetadata>) {
  const dependencies = toDependencyList(value);

  if (dependencies.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {fallback ?? "No dependencies"}
      </span>
    );
  }

  return (
    <div className="space-y-1">
      {dependencies.map((dependency, index) => (
        <Fragment key={dependency.id ?? index}>
          <div className="flex items-center gap-2 text-xs leading-snug">
            <span className="font-medium">
              {dependency.title ?? dependency.id}
            </span>
            {metadata.showStatus && dependency.status ? (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {dependency.status}
              </Badge>
            ) : null}
            {metadata.showBlockingBadge && dependency.blocked ? (
              <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
                Blocking
              </Badge>
            ) : null}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

export function DependencyColumnConfigurator({
  metadata,
  onChange,
  disabled,
}: ColumnConfiguratorProps<"dependency">) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dependency-field">Relationship field</Label>
        <Input
          id="dependency-field"
          value={metadata.dependencyField}
          onChange={(event) =>
            onChange({ ...metadata, dependencyField: event.target.value })
          }
          placeholder="e.g. blocked_by"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Determines which relational field is evaluated when deriving dependency
          status for this column.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <div>
          <Label htmlFor="dependency-show-status" className="text-sm font-medium">
            Show dependency status badges
          </Label>
          <p className="text-xs text-muted-foreground">
            Display the linked work item status next to each dependency.
          </p>
        </div>
        <Switch
          id="dependency-show-status"
          checked={metadata.showStatus}
          onCheckedChange={(checked) =>
            onChange({ ...metadata, showStatus: checked })
          }
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border p-3">
        <div>
          <Label htmlFor="dependency-show-blocking" className="text-sm font-medium">
            Highlight blocking work
          </Label>
          <p className="text-xs text-muted-foreground">
            Surface a destructive badge when linked work is blocking this item.
          </p>
        </div>
        <Switch
          id="dependency-show-blocking"
          checked={metadata.showBlockingBadge}
          onCheckedChange={(checked) =>
            onChange({ ...metadata, showBlockingBadge: checked })
          }
          disabled={disabled}
        />
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type { RollupColumnMetadata } from "@/types/boardColumns";
import {
  calculateRollup,
  type RollupComputation,
} from "@/lib/boards/columnCalculations";
import type {
  ColumnConfiguratorProps,
  ColumnRendererProps,
} from "./types";

const formatRollupValue = (rollup: RollupComputation, metadata: RollupColumnMetadata) => {
  if (rollup.value === null) {
    return "n/a";
  }

  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: metadata.precision,
    maximumFractionDigits: metadata.precision,
  });

  return formatter.format(rollup.value);
};

export function RollupColumnRenderer({
  value,
  metadata,
  fallback,
}: ColumnRendererProps<RollupColumnMetadata>) {
  const rollup = useMemo(() => {
    const rows = Array.isArray(value) ? value : [];
    return calculateRollup(rows, metadata);
  }, [metadata, value]);

  if (!rollup) {
    return (
      <span className="text-xs text-muted-foreground">
        {fallback ?? "No linked records"}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium uppercase tracking-wide text-muted-foreground">
          {metadata.aggregation}
        </span>
        <span className="font-semibold text-foreground">
          {formatRollupValue(rollup, metadata)}
        </span>
      </div>
      {typeof rollup.progress === "number" ? (
        <Progress value={Math.round(rollup.progress * 100)} className="h-1.5" />
      ) : null}
      <p className="text-[11px] text-muted-foreground">
        {rollup.count} records from {metadata.sourceCollection}
      </p>
    </div>
  );
}

export function RollupColumnConfigurator({
  metadata,
  onChange,
  disabled,
}: ColumnConfiguratorProps<"rollup">) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rollup-source">Source collection</Label>
          <Input
            id="rollup-source"
            value={metadata.sourceCollection}
            onChange={(event) =>
              onChange({ ...metadata, sourceCollection: event.target.value })
            }
            placeholder="subtasks"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rollup-field">Target field</Label>
          <Input
            id="rollup-field"
            value={metadata.targetField}
            onChange={(event) =>
              onChange({ ...metadata, targetField: event.target.value })
            }
            placeholder="completed"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rollup-aggregation">Aggregation</Label>
          <Select
            value={metadata.aggregation}
            onValueChange={(next) =>
              onChange({ ...metadata, aggregation: next as RollupColumnMetadata["aggregation"] })
            }
            disabled={disabled}
          >
            <SelectTrigger id="rollup-aggregation">
              <SelectValue placeholder="Select aggregation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sum">Sum</SelectItem>
              <SelectItem value="avg">Average</SelectItem>
              <SelectItem value="min">Minimum</SelectItem>
              <SelectItem value="max">Maximum</SelectItem>
              <SelectItem value="count">Count</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rollup-precision">Precision</Label>
          <Input
            id="rollup-precision"
            type="number"
            min={0}
            max={6}
            value={metadata.precision}
            onChange={(event) =>
              onChange({
                ...metadata,
                precision: Math.max(0, Math.min(6, Number(event.target.value) || 0)),
              })
            }
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormulaColumnMetadata } from "@/types/boardColumns";
import { evaluateFormula } from "@/lib/boards/columnCalculations";
import type {
  ColumnConfiguratorProps,
  ColumnRendererProps,
} from "./types";

const formatNumber = (value: number, metadata: FormulaColumnMetadata) => {
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: metadata.precision,
    maximumFractionDigits: metadata.precision,
    style: metadata.format === "currency" ? "currency" : "decimal",
    currency: metadata.format === "currency" ? "USD" : undefined,
  });

  if (metadata.format === "percent") {
    return `${formatter.format(value)}%`;
  }

  return formatter.format(value);
};

export function FormulaColumnRenderer({
  value,
  metadata,
  fallback,
}: ColumnRendererProps<FormulaColumnMetadata>) {
  const result = useMemo(() => {
    const evaluationContext =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : { value };

    try {
      return evaluateFormula(metadata.expression, evaluationContext);
    } catch (_error) {
      return null;
    }
  }, [metadata.expression, value]);

  if (result === null || Number.isNaN(result)) {
    return (
      <span className="text-xs text-muted-foreground">
        {fallback ?? "Formula error"}
      </span>
    );
  }

  const numeric = Number(result);
  if (Number.isFinite(numeric)) {
    return <span className="text-sm font-medium">{formatNumber(numeric, metadata)}</span>;
  }

  return <span className="text-sm font-medium">{String(result)}</span>;
}

export function FormulaColumnConfigurator({
  metadata,
  onChange,
  disabled,
}: ColumnConfiguratorProps<"formula">) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="formula-expression">Formula</Label>
        <Input
          id="formula-expression"
          value={metadata.expression}
          onChange={(event) =>
            onChange({ ...metadata, expression: event.target.value })
          }
          placeholder="({{completed}} / {{total}}) * 100"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Use double curly braces to reference fields from the row context.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="formula-format">Display format</Label>
          <Select
            value={metadata.format}
            onValueChange={(next) =>
              onChange({ ...metadata, format: next as FormulaColumnMetadata["format"] })
            }
            disabled={disabled}
          >
            <SelectTrigger id="formula-format">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="percent">Percent</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="formula-precision">Decimal precision</Label>
          <Input
            id="formula-precision"
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

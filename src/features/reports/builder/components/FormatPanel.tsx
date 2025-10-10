import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ReportQuery } from "@/server/analytics/types";

type FormatQuery = ReportQuery & {
  precision?: number;
  compact?: boolean;
};

interface FormatPanelProps {
  query: FormatQuery;
  onQueryChange: (query: FormatQuery) => void;
}

export function FormatPanel({ query, onQueryChange }: FormatPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="precision">Decimal Precision</Label>
        <Input
          id="precision"
          type="number"
          min={0}
          max={6}
          value={query.precision ?? 2}
          onChange={(event) =>
            onQueryChange({
              ...query,
              precision: Number.parseInt(event.target.value, 10),
            })
          }
        />
      </div>
      <div className="flex items-center justify-between rounded border p-3">
        <div>
          <Label>Compact Numbers</Label>
          <p className="text-xs text-muted-foreground">
            Abbreviate large numbers for executive-friendly views.
          </p>
        </div>
        <Switch
          checked={query.compact ?? true}
          onCheckedChange={(checked) =>
            onQueryChange({
              ...query,
              compact: checked,
            })
          }
        />
      </div>
    </div>
  );
}

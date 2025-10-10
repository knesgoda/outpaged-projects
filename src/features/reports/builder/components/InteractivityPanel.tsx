import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { ReportQuery } from "@/server/analytics/types";

type InteractivityQuery = ReportQuery & {
  crossFiltering?: boolean;
  drilldown?: boolean;
  annotations?: boolean;
  presentationMode?: boolean;
};

interface InteractivityPanelProps {
  query: InteractivityQuery;
  onQueryChange: (query: InteractivityQuery) => void;
}

export function InteractivityPanel({ query, onQueryChange }: InteractivityPanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ToggleRow
        label="Cross-filtering"
        description="Allow dashboard viewers to interactively filter companion tiles."
        value={query.crossFiltering ?? true}
        onChange={(value) => onQueryChange({ ...query, crossFiltering: value })}
      />
      <ToggleRow
        label="Drilldowns"
        description="Enable hierarchical exploration down to raw records."
        value={query.drilldown ?? false}
        onChange={(value) => onQueryChange({ ...query, drilldown: value })}
      />
      <ToggleRow
        label="Annotations"
        description="Show comments and audit history inline."
        value={query.annotations ?? true}
        onChange={(value) => onQueryChange({ ...query, annotations: value })}
      />
      <ToggleRow
        label="Presentation mode"
        description="Optimize layout for meetings and exec reviews."
        value={query.presentationMode ?? false}
        onChange={(value) => onQueryChange({ ...query, presentationMode: value })}
      />
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded border p-3">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

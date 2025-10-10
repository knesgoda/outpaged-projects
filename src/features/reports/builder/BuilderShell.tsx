import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { MetricDefinition, ReportQuery, SegmentDefinition } from "@/server/analytics/types";
import { VisualizationPanel } from "./components/VisualizationPanel";
import { Shelf } from "./components/Shelf";
import { FormatPanel } from "./components/FormatPanel";
import { InteractivityPanel } from "./components/InteractivityPanel";
import { CalculatedFieldModal } from "./components/CalculatedFieldModal";

type BuilderQuery = ReportQuery & {
  description?: string;
  tags?: string;
  visualization?: string;
  precision?: number;
  compact?: boolean;
  crossFiltering?: boolean;
  drilldown?: boolean;
  annotations?: boolean;
  presentationMode?: boolean;
};

export interface BuilderShellProps {
  initialQuery?: BuilderQuery;
  onRun?: (query: ReportQuery) => void;
  onSave?: (query: ReportQuery) => void;
}

const DEFAULT_QUERY: BuilderQuery = {
  source: "analytics.mv_event_daily",
  dimensions: ["date_key"],
  metrics: [
    {
      id: "events",
      label: "Events",
      column: "events",
      aggregation: "sum",
      format: "number",
    },
  ],
  filters: [],
};

export function BuilderShell({ initialQuery, onRun, onSave }: BuilderShellProps) {
  const [query, setQuery] = useState<BuilderQuery>(initialQuery ?? DEFAULT_QUERY);
  const [calculatedFieldOpen, setCalculatedFieldOpen] = useState(false);
  const [draftCalculation, setDraftCalculation] = useState<MetricDefinition | null>(null);

  const shelves = useMemo(
    () => ({
      dimensions: query.dimensions,
      metrics: query.metrics,
      filters: query.filters ?? [],
      segments: query.segments ?? [],
    }),
    [query]
  );

  const handleAddMetric = (metric: MetricDefinition) => {
    setQuery((current) => ({
      ...current,
      metrics: [...current.metrics, metric],
    }));
  };

  const handleAddFilter = (filter: SegmentDefinition["filters"][number]) => {
    setQuery((current) => ({
      ...current,
      filters: [...(current.filters ?? []), filter],
    }));
  };

  const handleRun = () => {
    onRun?.(query);
  };

  const handleSave = () => {
    onSave?.(query);
  };

  const openCalculatedField = () => {
    setDraftCalculation({
      id: "calc_" + (query.metrics.length + 1),
      label: "Calculated Field",
      column: "",
      aggregation: "sum",
    });
    setCalculatedFieldOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <CardTitle>Report Builder</CardTitle>
            <p className="text-sm text-muted-foreground">
              Drag-and-drop fields to shelves, adjust formatting, and configure governance-ready analytics.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRun}>Run</Button>
            <Button variant="secondary" onClick={handleSave}>
              Save
            </Button>
            <Button variant="outline" onClick={openCalculatedField}>
              Add calculation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Shelf label="Dimensions" items={shelves.dimensions} />
            <Shelf label="Metrics" items={shelves.metrics.map((metric) => metric.label)} />
            <Shelf label="Filters" items={shelves.filters.map((filter) => `${filter.column} ${filter.operator}`)} onAddFilter={handleAddFilter} />
          </div>
          <Separator />
          <Tabs defaultValue="visualize" className="space-y-4">
            <TabsList>
              <TabsTrigger value="visualize">Visualization</TabsTrigger>
              <TabsTrigger value="format">Formatting</TabsTrigger>
              <TabsTrigger value="interactivity">Interactivity</TabsTrigger>
              <TabsTrigger value="annotations">Annotations</TabsTrigger>
            </TabsList>
            <TabsContent value="visualize" className="space-y-4">
              <VisualizationPanel
                query={query}
                onQueryChange={setQuery}
                onAddMetric={handleAddMetric}
              />
            </TabsContent>
            <TabsContent value="format">
              <FormatPanel query={query} onQueryChange={setQuery} />
            </TabsContent>
            <TabsContent value="interactivity">
              <InteractivityPanel query={query} onQueryChange={setQuery} />
            </TabsContent>
            <TabsContent value="annotations">
              <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                Use annotations to highlight narratives, decisions, and compliance context across stakeholders.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Metadata & Governance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Description</span>
              <Textarea
                placeholder="Explain the purpose, audience, and governance considerations for this report"
                value={(query as unknown as { description?: string }).description ?? ""}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">Tags</span>
              <Input
                placeholder="finance, q4, shared"
                value={(query as unknown as { tags?: string }).tags ?? ""}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={cn("bg-primary/10 text-primary", "hover:bg-primary/20")}>Lineage</Badge>
            <Badge variant="outline">Accessibility</Badge>
            <Badge variant="secondary">Mobile ready</Badge>
            <Badge variant="outline">Embeddable</Badge>
          </div>
        </CardContent>
      </Card>
      <CalculatedFieldModal
        open={calculatedFieldOpen}
        metric={draftCalculation}
        onOpenChange={setCalculatedFieldOpen}
        onConfirm={(metric) => {
          if (metric) {
            handleAddMetric(metric);
          }
        }}
      />
    </div>
  );
}

export default BuilderShell;

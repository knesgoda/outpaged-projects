import { useState } from "react";
import { Activity, LineChart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useOperations } from "./OperationsProvider";

export function SloDashboardPanel() {
  const { sloDefinitions, recordSlo } = useOperations();
  const [sloDraft, setSloDraft] = useState({
    name: "API availability",
    indicator: "availability" as "availability" | "latency" | "error_rate",
    target: 99.9,
    burnRate: 1.0,
    incidents: "",
  });

  const handleCreateSlo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recordSlo({
      name: sloDraft.name,
      indicator: sloDraft.indicator,
      target: sloDraft.target,
      burnRate: sloDraft.burnRate,
      linkedIncidents: sloDraft.incidents.split(",").map((id) => id.trim()).filter(Boolean),
    });
    setSloDraft({ name: "API availability", indicator: sloDraft.indicator, target: sloDraft.target, burnRate: sloDraft.burnRate, incidents: "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLO dashboard</CardTitle>
        <CardDescription>
          Track service-level objectives, burn rates, and related incidents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateSlo} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label>SLO name</Label>
            <Input
              value={sloDraft.name}
              onChange={(event) => setSloDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Indicator</Label>
            <Select value={sloDraft.indicator} onValueChange={(value) => setSloDraft((prev) => ({ ...prev, indicator: value as typeof prev.indicator }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="availability">Availability</SelectItem>
                <SelectItem value="latency">Latency</SelectItem>
                <SelectItem value="error_rate">Error rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Target %</Label>
            <Input
              type="number"
              value={sloDraft.target}
              onChange={(event) => setSloDraft((prev) => ({ ...prev, target: Number(event.target.value) }))}
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Burn rate</Label>
            <Input
              type="number"
              step="0.1"
              value={sloDraft.burnRate}
              onChange={(event) => setSloDraft((prev) => ({ ...prev, burnRate: Number(event.target.value) }))}
            />
          </div>
          <div className="lg:col-span-12 space-y-2">
            <Label>Linked incidents</Label>
            <Input
              value={sloDraft.incidents}
              onChange={(event) => setSloDraft((prev) => ({ ...prev, incidents: event.target.value }))}
              placeholder="INC-1, INC-2"
            />
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">
              <LineChart className="h-4 w-4 mr-2" /> Save SLO
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          {sloDefinitions.length === 0 ? (
            <p className="text-muted-foreground">No SLOs defined yet.</p>
          ) : (
            sloDefinitions.map((slo) => (
              <Card key={slo.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" /> {slo.name}
                  </CardTitle>
                  <CardDescription>
                    {slo.indicator} • Target {slo.target}% • Burn {slo.burnRate ?? 1}x
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {slo.linkedIncidents.length === 0 ? (
                    <Badge variant="outline">No incidents</Badge>
                  ) : (
                    slo.linkedIncidents.map((incident) => (
                      <Badge key={incident} variant="outline">{incident}</Badge>
                    ))
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

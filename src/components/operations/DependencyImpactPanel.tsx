import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { addDays, format } from "date-fns";
import { DownloadCloud, Network, Target } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useOperations } from "./OperationsProvider";

interface DependencyDraft {
  name: string;
  team: string;
  status: string;
  dueDate: string;
  dependsOn: string[];
  criticalPath: boolean;
}

export function DependencyImpactPanel() {
  const { dependencyItems, registerDependencyItem } = useOperations();
  const [filters, setFilters] = useState({ team: "all", status: "all" });
  const [draft, setDraft] = useState<DependencyDraft>({
    name: "",
    team: "",
    status: "planned",
    dueDate: new Date().toISOString().slice(0, 10),
    dependsOn: [],
    criticalPath: false,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [delayDays, setDelayDays] = useState(0);

  const nodes: Node[] = dependencyItems.map((item, index) => ({
    id: item.id,
    data: { label: `${item.name}\n${item.team}` },
    position: { x: (index % 4) * 200, y: Math.floor(index / 4) * 120 },
    style: {
      border: item.criticalPath ? "2px solid var(--primary)" : "1px solid var(--border)",
      padding: 12,
      borderRadius: 8,
      background: "var(--card)",
    },
  }));

  const edges: Edge[] = dependencyItems.flatMap((item) =>
    item.dependsOn.map((dependencyId) => ({ id: `${dependencyId}-${item.id}`, source: dependencyId, target: item.id }))
  );

  const filteredItems = dependencyItems.filter((item) => {
    const teamMatch = filters.team === "all" || item.team === filters.team;
    const statusMatch = filters.status === "all" || item.status === filters.status;
    return teamMatch && statusMatch;
  });

  const selectedItem = dependencyItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;

  const impactedItems = useMemo(() => {
    if (!selectedItem) return [] as typeof dependencyItems;
    const visited = new Set<string>();
    const result: typeof dependencyItems = [];

    const traverse = (id: string) => {
      dependencyItems.forEach((item) => {
        if (item.dependsOn.includes(id) && !visited.has(item.id)) {
          visited.add(item.id);
          result.push(item);
          traverse(item.id);
        }
      });
    };

    traverse(selectedItem.id);
    return result;
  }, [dependencyItems, selectedItem]);

  const handleCreateDependency = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name || !draft.team || !draft.dueDate) return;
    registerDependencyItem({
      name: draft.name,
      team: draft.team,
      status: draft.status,
      dueDate: draft.dueDate,
      dependsOn: draft.dependsOn,
      criticalPath: draft.criticalPath,
    });
    setDraft({ name: "", team: "", status: "planned", dueDate: new Date().toISOString().slice(0, 10), dependsOn: [], criticalPath: false });
  };

  const exportImpactCsv = () => {
    if (!selectedItem) return;
    const rows = [selectedItem, ...impactedItems].map((item) => ({
      item: item.name,
      team: item.team,
      status: item.status,
      dueDate: item.dueDate,
    }));
    const header = "Item,Team,Status,Due Date";
    const data = rows.map((row) => `${row.item},${row.team},${row.status},${row.dueDate}`);
    const blob = new Blob([header + "\n" + data.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "impact-analysis.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const adjustedDueDate = selectedItem
    ? format(addDays(new Date(selectedItem.dueDate), delayDays), "MMM d, yyyy")
    : "-";

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Dependency graph & impact analysis</CardTitle>
        <CardDescription>
          Visualize cross-team dependencies, filter by ownership, and forecast downstream delays with shareable exports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateDependency} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="dependency-name">Item</Label>
            <Input
              id="dependency-name"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Release payments"
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label htmlFor="dependency-team">Team</Label>
            <Input
              id="dependency-team"
              value={draft.team}
              onChange={(event) => setDraft((prev) => ({ ...prev, team: event.target.value }))}
              placeholder="Payments"
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Status</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={draft.status}
              onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Due date</Label>
            <Input
              type="date"
              value={draft.dueDate}
              onChange={(event) => setDraft((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Depends on</Label>
            <Textarea
              value={draft.dependsOn.join(",")}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  dependsOn: event.target.value.split(",").map((id) => id.trim()).filter(Boolean),
                }))
              }
              placeholder="Paste IDs separated by commas"
              rows={2}
            />
          </div>
          <div className="lg:col-span-1 space-y-2">
            <Label>Critical path</Label>
            <Select
              value={draft.criticalPath ? "yes" : "no"}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, criticalPath: value === "yes" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">
              Add dependency
            </Button>
          </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 border rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Network className="h-4 w-4" /> Dependency graph
              </div>
              <div className="flex gap-2 text-xs">
                <select
                  className="rounded-md border border-input bg-transparent px-2 py-1"
                  value={filters.team}
                  onChange={(event) => setFilters((prev) => ({ ...prev, team: event.target.value }))}
                >
                  <option value="all">All teams</option>
                  {Array.from(new Set(dependencyItems.map((item) => item.team))).map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-input bg-transparent px-2 py-1"
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="all">All statuses</option>
                  {Array.from(new Set(dependencyItems.map((item) => item.status))).map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-[320px] rounded-md border">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                onNodeClick={(_, node) => setSelectedId(node.id)}
              >
                <MiniMap />
                <Controls />
                <Background />
              </ReactFlow>
            </div>
          </div>

          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" /> Impact forecast
            </div>
            {selectedItem ? (
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Selected item</div>
                  <div className="font-medium">{selectedItem.name}</div>
                  <div className="text-xs text-muted-foreground">Due {selectedItem.dueDate}</div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="impact-delay">Delay (days)</Label>
                  <Input
                    id="impact-delay"
                    type="number"
                    value={delayDays}
                    onChange={(event) => setDelayDays(Number(event.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    New completion date {adjustedDueDate}. Downstream items will inherit the same delay.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Impacted items</div>
                  <div className="flex flex-wrap gap-2">
                    {impactedItems.map((item) => (
                      <Badge key={item.id} variant={item.criticalPath ? "destructive" : "outline"}>
                        {item.name}
                      </Badge>
                    ))}
                    {impactedItems.length === 0 && <Badge variant="outline">No downstream impacts</Badge>}
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={exportImpactCsv}>
                  <DownloadCloud className="h-4 w-4 mr-2" /> Export impact list
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a node in the graph to forecast delays.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { Flame, Target, TrendingUp } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useOperations } from "./OperationsProvider";

export function PortfolioOkrsPanel() {
  const { initiatives, dependencyRisks, objectives, updatePortfolio, saveDependencyRisk, saveObjective } = useOperations();
  const [initiativeDraft, setInitiativeDraft] = useState({
    name: "",
    health: "green" as "green" | "amber" | "red",
    progress: 0,
    budgetPlanned: "",
    budgetActual: "",
  });
  const [riskDraft, setRiskDraft] = useState({ blockingTeam: "", blockedTeam: "", severity: "medium", count: 1 });
  const [objectiveDraft, setObjectiveDraft] = useState({
    name: "",
    description: "",
    quarter: "Q1",
    owner: "",
    keyResults: "",
  });

  const heatmapMatrix = useMemo(() => {
    const matrix = new Map<string, Map<string, number>>();
    dependencyRisks.forEach((risk) => {
      if (!matrix.has(risk.blockingTeam)) matrix.set(risk.blockingTeam, new Map());
      const row = matrix.get(risk.blockingTeam)!;
      row.set(risk.blockedTeam, (row.get(risk.blockedTeam) ?? 0) + risk.count);
    });
    return matrix;
  }, [dependencyRisks]);

  const handleCreateInitiative = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!initiativeDraft.name) return;
    updatePortfolio({
      name: initiativeDraft.name,
      health: initiativeDraft.health,
      progress: initiativeDraft.progress,
      budgetPlanned: initiativeDraft.budgetPlanned ? Number(initiativeDraft.budgetPlanned) : undefined,
      budgetActual: initiativeDraft.budgetActual ? Number(initiativeDraft.budgetActual) : undefined,
      epicIds: [],
    });
    setInitiativeDraft({ name: "", health: "green", progress: 0, budgetPlanned: "", budgetActual: "" });
  };

  const handleCreateRisk = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!riskDraft.blockingTeam || !riskDraft.blockedTeam) return;
    saveDependencyRisk({
      blockingTeam: riskDraft.blockingTeam,
      blockedTeam: riskDraft.blockedTeam,
      severity: riskDraft.severity as "low" | "medium" | "high",
      count: riskDraft.count,
      impactedItems: [],
    });
    setRiskDraft({ blockingTeam: "", blockedTeam: "", severity: "medium", count: 1 });
  };

  const handleCreateObjective = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!objectiveDraft.name) return;
    const keyResults = objectiveDraft.keyResults
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({ id: `${Date.now()}-${index}`, name: line, target: 100, current: 0, linkedItemIds: [] }));
    saveObjective({
      name: objectiveDraft.name,
      description: objectiveDraft.description,
      quarter: objectiveDraft.quarter,
      owner: objectiveDraft.owner,
      keyResults,
    });
    setObjectiveDraft({ name: "", description: "", quarter: "Q1", owner: "", keyResults: "" });
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Portfolio & OKRs</CardTitle>
        <CardDescription>
          Track initiative health, dependency risk hotspots, and OKR progress across the portfolio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateInitiative} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label htmlFor="initiative-name">Initiative</Label>
            <Input
              id="initiative-name"
              value={initiativeDraft.name}
              onChange={(event) => setInitiativeDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Improve onboarding"
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Health</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={initiativeDraft.health}
              onChange={(event) => setInitiativeDraft((prev) => ({ ...prev, health: event.target.value as typeof prev.health }))}
            >
              <option value="green">Green</option>
              <option value="amber">Amber</option>
              <option value="red">Red</option>
            </select>
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Progress %</Label>
            <Input
              type="number"
              value={initiativeDraft.progress}
              onChange={(event) => setInitiativeDraft((prev) => ({ ...prev, progress: Number(event.target.value) }))}
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Budget planned</Label>
            <Input
              type="number"
              value={initiativeDraft.budgetPlanned}
              onChange={(event) => setInitiativeDraft((prev) => ({ ...prev, budgetPlanned: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Budget actual</Label>
            <Input
              type="number"
              value={initiativeDraft.budgetActual}
              onChange={(event) => setInitiativeDraft((prev) => ({ ...prev, budgetActual: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">Add initiative</Button>
          </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-3 text-sm">
          {initiatives.map((initiative) => (
            <Card key={initiative.id} className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> {initiative.name}
                </CardTitle>
                <CardDescription>
                  Health {initiative.health.toUpperCase()} • {initiative.progress}% complete
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {initiative.budgetPlanned && (
                  <div>Budget: {initiative.budgetActual ?? 0}/{initiative.budgetPlanned}</div>
                )}
                <div className="flex gap-2">
                  <Badge variant="outline">Initiative</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {initiatives.length === 0 && (
            <div className="lg:col-span-3 text-sm text-muted-foreground border rounded-lg p-6">
              Capture initiatives to monitor health across your portfolio.
            </div>
          )}
        </div>

        <form onSubmit={handleCreateRisk} className="grid gap-3 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-1">
            <Label>Blocking team</Label>
            <Input
              value={riskDraft.blockingTeam}
              onChange={(event) => setRiskDraft((prev) => ({ ...prev, blockingTeam: event.target.value }))}
              placeholder="Payments"
            />
          </div>
          <div className="lg:col-span-3 space-y-1">
            <Label>Blocked team</Label>
            <Input
              value={riskDraft.blockedTeam}
              onChange={(event) => setRiskDraft((prev) => ({ ...prev, blockedTeam: event.target.value }))}
              placeholder="Mobile"
            />
          </div>
          <div className="lg:col-span-2 space-y-1">
            <Label>Severity</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={riskDraft.severity}
              onChange={(event) => setRiskDraft((prev) => ({ ...prev, severity: event.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="lg:col-span-2 space-y-1">
            <Label>Count</Label>
            <Input
              type="number"
              value={riskDraft.count}
              onChange={(event) => setRiskDraft((prev) => ({ ...prev, count: Number(event.target.value) }))}
            />
          </div>
          <div className="lg:col-span-2 flex items-end justify-end">
            <Button type="submit">Log risk</Button>
          </div>
        </form>

        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4" /> Dependency risk heatmap
          </div>
          {heatmapMatrix.size === 0 ? (
            <p className="text-sm text-muted-foreground">No cross-team risks recorded.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[400px] text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-2">Blocking \ Blocked</th>
                    {[...heatmapMatrix.values()][0] ? Array.from(new Set(Array.from(heatmapMatrix.values()).flatMap((row) => Array.from(row.keys())))).map((team) => (
                      <th key={team} className="text-left p-2">{team}</th>
                    )) : null}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(heatmapMatrix.entries()).map(([blockingTeam, row]) => (
                    <tr key={blockingTeam}>
                      <td className="p-2 font-medium">{blockingTeam}</td>
                      {Array.from(new Set(Array.from(heatmapMatrix.values()).flatMap((r) => Array.from(r.keys())))).map((team) => (
                        <td key={`${blockingTeam}-${team}`} className="p-2">
                          {row.get(team) ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form onSubmit={handleCreateObjective} className="grid gap-3 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-1">
            <Label htmlFor="okr-name">Objective</Label>
            <Input
              id="okr-name"
              value={objectiveDraft.name}
              onChange={(event) => setObjectiveDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Grow weekly active users"
            />
          </div>
          <div className="lg:col-span-3 space-y-1">
            <Label htmlFor="okr-owner">Owner</Label>
            <Input
              id="okr-owner"
              value={objectiveDraft.owner}
              onChange={(event) => setObjectiveDraft((prev) => ({ ...prev, owner: event.target.value }))}
              placeholder="VP Product"
            />
          </div>
          <div className="lg:col-span-2 space-y-1">
            <Label>Quarter</Label>
            <select
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={objectiveDraft.quarter}
              onChange={(event) => setObjectiveDraft((prev) => ({ ...prev, quarter: event.target.value }))}
            >
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
          <div className="lg:col-span-12 space-y-1">
            <Label>Key results</Label>
            <Textarea
              value={objectiveDraft.keyResults}
              onChange={(event) => setObjectiveDraft((prev) => ({ ...prev, keyResults: event.target.value }))}
              placeholder="KR1: Increase activation to 45%\nKR2: Ship onboarding tour"
            />
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">Create objective</Button>
          </div>
        </form>

        <div className="grid gap-3 lg:grid-cols-2 text-sm">
          {objectives.map((objective) => (
            <Card key={objective.id} className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" /> {objective.name}
                </CardTitle>
                <CardDescription>
                  {objective.quarter} • Owned by {objective.owner}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p>{objective.description}</p>
                <div className="space-y-1">
                  {objective.keyResults.map((kr) => (
                    <div key={kr.id} className="flex justify-between">
                      <span>{kr.name}</span>
                      <Badge variant="outline">{kr.current}% / {kr.target}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {objectives.length === 0 && (
            <div className="lg:col-span-2 text-sm text-muted-foreground border rounded-lg p-6">
              Capture quarterly objectives and their measurable key results here.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

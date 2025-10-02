import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calculator, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ScenarioPlannerProps {
  projectId?: string;
}

export function ScenarioPlanner({ projectId }: ScenarioPlannerProps) {
  const [capacity, setCapacity] = useState([100]);
  const [changeRate, setChangeRate] = useState([100]);
  const [velocity, setVelocity] = useState([100]);

  // Calculate scenario impact
  const capacityMultiplier = capacity[0] / 100;
  const changeRateMultiplier = changeRate[0] / 100;
  const velocityMultiplier = velocity[0] / 100;

  // Base projection
  const baseData = [
    { sprint: 1, baseline: 25, scenario: 25 },
    { sprint: 2, baseline: 25, scenario: 25 },
    { sprint: 3, baseline: 25, scenario: 25 },
    { sprint: 4, baseline: 25, scenario: 25 },
    { sprint: 5, baseline: 25, scenario: 25 },
    { sprint: 6, baseline: 25, scenario: 25 },
  ];

  // Apply scenario multipliers
  const scenarioData = baseData.map((d, i) => ({
    ...d,
    scenario: Math.round(d.baseline * velocityMultiplier * (1 + (i * 0.05 * capacityMultiplier)) * changeRateMultiplier),
  }));

  const totalBaseline = baseData.reduce((sum, d) => sum + d.baseline, 0);
  const totalScenario = scenarioData.reduce((sum, d) => sum + d.scenario, 0);
  const impact = totalScenario - totalBaseline;
  const impactPercent = ((impact / totalBaseline) * 100).toFixed(1);

  const completionDate = new Date();
  const daysImpact = Math.round(-impact * 0.5); // Rough estimate
  completionDate.setDate(completionDate.getDate() + daysImpact);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Scenario Planning</h2>
        <p className="text-sm text-muted-foreground">
          Model what-if scenarios by adjusting key parameters
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Parameter Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Scenario Parameters
            </CardTitle>
            <CardDescription>Adjust sliders to model different scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Team Capacity</Label>
                <Badge variant="outline">{capacity[0]}%</Badge>
              </div>
              <Slider
                value={capacity}
                onValueChange={setCapacity}
                min={50}
                max={150}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Simulate team scaling or capacity changes
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Scope Change Rate</Label>
                <Badge variant="outline">{changeRate[0]}%</Badge>
              </div>
              <Slider
                value={changeRate}
                onValueChange={setChangeRate}
                min={50}
                max={150}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Account for scope creep or reduction
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Velocity Multiplier</Label>
                <Badge variant="outline">{velocity[0]}%</Badge>
              </div>
              <Slider
                value={velocity}
                onValueChange={setVelocity}
                min={50}
                max={150}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Factor in productivity improvements or setbacks
              </p>
            </div>

            <Button className="w-full" variant="outline">
              Save Scenario
            </Button>
          </CardContent>
        </Card>

        {/* Impact Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Scenario Impact</CardTitle>
            <CardDescription>Projected outcome vs baseline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Baseline Total</div>
                <div className="text-2xl font-bold">{totalBaseline}</div>
                <div className="text-xs text-muted-foreground mt-1">items</div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-primary/5">
                <div className="text-sm text-muted-foreground mb-1">Scenario Total</div>
                <div className="text-2xl font-bold">{totalScenario}</div>
                <div className="text-xs text-muted-foreground mt-1">items</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Impact</div>
                <div className={`text-2xl font-bold ${impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {impact >= 0 ? '+' : ''}{impact}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {impact >= 0 ? '+' : ''}{impactPercent}%
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Completion:</span>
                <span className="font-medium">
                  {completionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Time Impact:</span>
                <Badge variant={daysImpact < 0 ? 'default' : 'destructive'}>
                  {daysImpact >= 0 ? '+' : ''}{daysImpact} days
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Baseline vs Scenario Comparison</CardTitle>
          <CardDescription>Sprint-by-sprint projection</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scenarioData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="sprint" 
                className="text-xs"
                label={{ value: 'Sprint', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                className="text-xs"
                label={{ value: 'Items Completed', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <ReferenceLine y={25} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Line 
                type="monotone" 
                dataKey="baseline" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Baseline"
              />
              <Line 
                type="monotone" 
                dataKey="scenario" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={3}
                name="Scenario"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

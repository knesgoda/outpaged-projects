import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, Target } from "lucide-react";

export function EstimationTools() {
  const [reach, setReach] = useState<number>(0);
  const [impact, setImpact] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [effort, setEffort] = useState<number>(0);

  const [wsjfValue, setWsjfValue] = useState<number>(0);
  const [wsjfBusinessValue, setWsjfBusinessValue] = useState<number>(0);
  const [wsjfTimeCriticality, setWsjfTimeCriticality] = useState<number>(0);
  const [wsjfRiskReduction, setWsjfRiskReduction] = useState<number>(0);
  const [wsjfJobSize, setWsjfJobSize] = useState<number>(0);

  const calculateRICE = () => {
    if (effort === 0) return 0;
    return ((reach * impact * confidence) / 100) / effort;
  };

  const calculateWSJF = () => {
    if (wsjfJobSize === 0) return 0;
    return (wsjfBusinessValue + wsjfTimeCriticality + wsjfRiskReduction) / wsjfJobSize;
  };

  const riceScore = calculateRICE();
  const wsjfScore = calculateWSJF();

  const getRiceColor = (score: number) => {
    if (score >= 10) return "bg-green-500";
    if (score >= 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getWsjfColor = (score: number) => {
    if (score >= 10) return "bg-green-500";
    if (score >= 5) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Prioritization Frameworks
        </h2>
        <p className="text-muted-foreground">
          Use RICE or WSJF scoring to prioritize your backlog items
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* RICE Scoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              RICE Score
            </CardTitle>
            <CardDescription>
              Reach × Impact × Confidence ÷ Effort
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reach">Reach (# of people/period)</Label>
              <Input
                id="reach"
                type="number"
                value={reach}
                onChange={(e) => setReach(Number(e.target.value))}
                placeholder="e.g., 1000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="impact">Impact (0.25, 0.5, 1, 2, 3)</Label>
              <Input
                id="impact"
                type="number"
                step="0.25"
                value={impact}
                onChange={(e) => setImpact(Number(e.target.value))}
                placeholder="e.g., 2"
              />
              <p className="text-xs text-muted-foreground">
                Massive=3, High=2, Medium=1, Low=0.5, Minimal=0.25
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidence">Confidence (%)</Label>
              <Input
                id="confidence"
                type="number"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                placeholder="e.g., 80"
              />
              <p className="text-xs text-muted-foreground">
                High=100%, Medium=80%, Low=50%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effort">Effort (person-months)</Label>
              <Input
                id="effort"
                type="number"
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
                placeholder="e.g., 2"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">RICE Score:</span>
                <Badge className={`${getRiceColor(riceScore)} text-white text-lg px-4 py-2`}>
                  {riceScore.toFixed(2)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {riceScore >= 10 && "High priority - Do this first"}
                {riceScore >= 5 && riceScore < 10 && "Medium priority - Schedule soon"}
                {riceScore < 5 && "Low priority - Consider deprioritizing"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* WSJF Scoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              WSJF Score
            </CardTitle>
            <CardDescription>
              (Business Value + Time Criticality + Risk Reduction) ÷ Job Size
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wsjf-value">Business Value (1-10)</Label>
              <Input
                id="wsjf-value"
                type="number"
                min="1"
                max="10"
                value={wsjfBusinessValue}
                onChange={(e) => setWsjfBusinessValue(Number(e.target.value))}
                placeholder="e.g., 8"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wsjf-time">Time Criticality (1-10)</Label>
              <Input
                id="wsjf-time"
                type="number"
                min="1"
                max="10"
                value={wsjfTimeCriticality}
                onChange={(e) => setWsjfTimeCriticality(Number(e.target.value))}
                placeholder="e.g., 5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wsjf-risk">Risk Reduction (1-10)</Label>
              <Input
                id="wsjf-risk"
                type="number"
                min="1"
                max="10"
                value={wsjfRiskReduction}
                onChange={(e) => setWsjfRiskReduction(Number(e.target.value))}
                placeholder="e.g., 3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wsjf-size">Job Size (1-10)</Label>
              <Input
                id="wsjf-size"
                type="number"
                min="1"
                max="10"
                value={wsjfJobSize}
                onChange={(e) => setWsjfJobSize(Number(e.target.value))}
                placeholder="e.g., 5"
              />
              <p className="text-xs text-muted-foreground">
                Fibonacci: XS=1, S=2, M=3, L=5, XL=8
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">WSJF Score:</span>
                <Badge className={`${getWsjfColor(wsjfScore)} text-white text-lg px-4 py-2`}>
                  {wsjfScore.toFixed(2)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {wsjfScore >= 10 && "Highest priority - Critical path"}
                {wsjfScore >= 5 && wsjfScore < 10 && "Medium priority - Important work"}
                {wsjfScore < 5 && "Lower priority - Can be deferred"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Story Point Reference</CardTitle>
          <CardDescription>Fibonacci sequence for estimation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 5, 8, 13, 21].map((points) => (
              <Button key={points} variant="outline" className="font-mono">
                {points}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            1-2: Simple tasks • 3-5: Moderate complexity • 8-13: Complex features • 21+: Break down further
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

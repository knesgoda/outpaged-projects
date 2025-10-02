import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  capacity: number; // hours per sprint
  committed: number;
  availability: number; // percentage
}

interface SprintCapacity {
  totalCapacity: number;
  totalCommitted: number;
  utilizationRate: number;
  recommendedCommitment: number;
}

export function CapacityPlanner() {
  const [teamMembers] = useState<TeamMember[]>([
    { id: "1", name: "Alice Johnson", capacity: 80, committed: 65, availability: 100 },
    { id: "2", name: "Bob Smith", capacity: 80, committed: 72, availability: 100 },
    { id: "3", name: "Carol Davis", capacity: 64, committed: 48, availability: 80 }, // Part-time
    { id: "4", name: "David Lee", capacity: 80, committed: 80, availability: 100 },
    { id: "5", name: "Eve Martinez", capacity: 40, committed: 30, availability: 50 }, // PTO
  ]);

  const [historicalVelocity] = useState({
    average: 42,
    stdDev: 6,
    last3Sprints: [38, 45, 43],
  });

  const calculateCapacity = (): SprintCapacity => {
    const totalCapacity = teamMembers.reduce((sum, m) => sum + m.capacity, 0);
    const totalCommitted = teamMembers.reduce((sum, m) => sum + m.committed, 0);
    const utilizationRate = (totalCommitted / totalCapacity) * 100;
    
    // Recommend based on 70-85% capacity + historical velocity
    const recommendedCommitment = Math.round(
      historicalVelocity.average * 0.9 + 
      (totalCapacity * 0.75 / 8) // Assuming 8 hours per story point
    );

    return {
      totalCapacity,
      totalCommitted,
      utilizationRate,
      recommendedCommitment,
    };
  };

  const capacity = calculateCapacity();

  const getUtilizationStatus = (rate: number) => {
    if (rate < 60) return { color: "text-yellow-600", label: "Under-utilized", icon: AlertTriangle };
    if (rate > 90) return { color: "text-red-600", label: "Over-committed", icon: AlertTriangle };
    return { color: "text-green-600", label: "Optimal", icon: CheckCircle2 };
  };

  const status = getUtilizationStatus(capacity.utilizationRate);
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sprint Capacity Planning
          </CardTitle>
          <CardDescription>
            Plan team capacity and commitment for upcoming sprint
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Capacity Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{capacity.totalCapacity}h</div>
                <p className="text-sm text-muted-foreground">Total Capacity</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{capacity.totalCommitted}h</div>
                <p className="text-sm text-muted-foreground">Committed</p>
                <Progress value={capacity.utilizationRate} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className={`text-2xl font-bold flex items-center gap-2 ${status.color}`}>
                  <StatusIcon className="h-5 w-5" />
                  {capacity.utilizationRate.toFixed(0)}%
                </div>
                <p className="text-sm text-muted-foreground">{status.label}</p>
              </CardContent>
            </Card>
          </div>

          {/* Velocity-Based Recommendation */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/20 p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Recommended Commitment</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on historical velocity (avg: {historicalVelocity.average} points, 
                    last 3 sprints: {historicalVelocity.last3Sprints.join(", ")})
                  </p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {capacity.recommendedCommitment}
                    </span>
                    <span className="text-sm text-muted-foreground">story points</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Range: {capacity.recommendedCommitment - 5} - {capacity.recommendedCommitment + 5} points 
                    (based on ±1 standard deviation)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Member Breakdown */}
          <div>
            <h3 className="font-semibold mb-4">Team Member Capacity</h3>
            <div className="space-y-3">
              {teamMembers.map((member) => {
                const utilization = (member.committed / member.capacity) * 100;
                return (
                  <div key={member.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{member.name}</span>
                        <div className="flex items-center gap-2">
                          {member.availability < 100 && (
                            <Badge variant="outline" className="text-xs">
                              {member.availability}% available
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {member.committed}h / {member.capacity}h
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={utilization} 
                        className={utilization > 95 ? "[&>div]:bg-destructive" : ""}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Forecast Confidence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Forecast Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Conservative (90% confidence)</span>
                  <Badge>{historicalVelocity.average - historicalVelocity.stdDev} points</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Expected (50% confidence)</span>
                  <Badge variant="secondary">{historicalVelocity.average} points</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Optimistic (10% confidence)</span>
                  <Badge variant="outline">{historicalVelocity.average + historicalVelocity.stdDev} points</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

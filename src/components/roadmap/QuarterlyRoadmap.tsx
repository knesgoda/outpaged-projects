import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter, Save, Share2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Initiative {
  id: string;
  name: string;
  team: string;
  quarter: string;
  health: "green" | "amber" | "red";
  startDate: string;
  endDate: string;
  milestones?: Milestone[];
  dependencies?: string[];
}

interface Milestone {
  id: string;
  name: string;
  date: string;
  completed: boolean;
}

interface QuarterlyRoadmapProps {
  initiatives: Initiative[];
  onInitiativeClick?: (id: string) => void;
}

export function QuarterlyRoadmap({ initiatives, onInitiativeClick }: QuarterlyRoadmapProps) {
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedQuarter, setSelectedQuarter] = useState("all");
  const [selectedHealth, setSelectedHealth] = useState("all");

  const quarters = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025"];
  const teams = [...new Set(initiatives.map(i => i.team))];

  const filteredInitiatives = initiatives.filter(initiative => {
    const matchesTeam = selectedTeam === "all" || initiative.team === selectedTeam;
    const matchesQuarter = selectedQuarter === "all" || initiative.quarter === selectedQuarter;
    const matchesHealth = selectedHealth === "all" || initiative.health === selectedHealth;
    return matchesTeam && matchesQuarter && matchesHealth;
  });

  const getHealthColor = (health: string) => {
    const colors = {
      green: "bg-green-500",
      amber: "bg-amber-500",
      red: "bg-red-500",
    };
    return colors[health as keyof typeof colors] || colors.green;
  };

  const getHealthBadge = (health: string) => {
    const variants = {
      green: "bg-green-500/10 text-green-500 border-green-500/20",
      amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      red: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return variants[health as keyof typeof variants];
  };

  const getDaysFromStart = (startDate: string) => {
    const start = new Date(startDate);
    const today = new Date();
    return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTotalDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Quarterly Roadmap
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Strategic initiatives and key milestones
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save View
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                {quarters.map(q => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedHealth} onValueChange={setSelectedHealth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Health" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Health</SelectItem>
                <SelectItem value="green">On Track</SelectItem>
                <SelectItem value="amber">At Risk</SelectItem>
                <SelectItem value="red">Off Track</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-6">
            {filteredInitiatives.map(initiative => {
              const progress = getDaysFromStart(initiative.startDate);
              const total = getTotalDuration(initiative.startDate, initiative.endDate);
              const percentage = Math.min(100, Math.max(0, (progress / total) * 100));

              return (
                <Card 
                  key={initiative.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onInitiativeClick?.(initiative.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{initiative.name}</h3>
                          <Badge variant="outline" className={cn(getHealthBadge(initiative.health))}>
                            {initiative.health === "green" && "On Track"}
                            {initiative.health === "amber" && "At Risk"}
                            {initiative.health === "red" && "Off Track"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{initiative.team}</span>
                          <span>•</span>
                          <span>{initiative.quarter}</span>
                          <span>•</span>
                          <span>{new Date(initiative.startDate).toLocaleDateString()} - {new Date(initiative.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {initiative.dependencies && initiative.dependencies.length > 0 && (
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-500">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {initiative.dependencies.length} Dependencies
                        </Badge>
                      )}
                    </div>

                    <div className="relative">
                      <div className="h-8 bg-muted rounded-lg overflow-hidden">
                        <div
                          className={cn("h-full transition-all", getHealthColor(initiative.health))}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {initiative.milestones && initiative.milestones.length > 0 && (
                        <div className="absolute -bottom-2 left-0 right-0 flex justify-between px-2">
                          {initiative.milestones.map(milestone => {
                            const milestoneDate = new Date(milestone.date);
                            const milestoneProgress = getDaysFromStart(initiative.startDate);
                            const milestoneDays = Math.floor((milestoneDate.getTime() - new Date(initiative.startDate).getTime()) / (1000 * 60 * 60 * 24));
                            const milestonePosition = (milestoneDays / total) * 100;

                            return (
                              <div
                                key={milestone.id}
                                className="relative"
                                style={{ left: `${milestonePosition}%` }}
                                title={`${milestone.name} - ${milestoneDate.toLocaleDateString()}`}
                              >
                                <div className={cn(
                                  "w-4 h-4 rotate-45 border-2",
                                  milestone.completed 
                                    ? "bg-green-500 border-green-600" 
                                    : "bg-background border-foreground"
                                )} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {initiative.milestones && initiative.milestones.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-6">
                        {initiative.milestones.map(milestone => (
                          <Badge
                            key={milestone.id}
                            variant={milestone.completed ? "default" : "outline"}
                            className="text-xs"
                          >
                            {milestone.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

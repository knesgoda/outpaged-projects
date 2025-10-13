import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X, TrendingDown, TrendingUp, Users, Calendar, Check } from "lucide-react";
import { useResourceWorkload } from "@/hooks/useResourceWorkload";
import { useOperations, type AssistantGuardrail } from "@/components/operations/OperationsProvider";
import { useTelemetry } from "@/components/telemetry/TelemetryProvider";
import { format, isWithinInterval } from "date-fns";

interface Suggestion {
  id: string;
  type: 'reassign' | 'split' | 'reschedule' | 'swap' | 'pair';
  title: string;
  description: string;
  impact: {
    utilizationDelta: number;
    deadlineRisk: number;
    affected: number;
  };
  confidence: number;
  details: string[];
  guardrailId: string;
  impactedUsers: string[];
}

interface BalancingAssistantProps {
  onClose: () => void;
}

export function BalancingAssistant({ onClose }: BalancingAssistantProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [applying, setApplying] = useState<string | null>(null);
  const telemetry = useTelemetry();
  const { assistantGuardrails, recordAssistantRecommendation, clearAssistantRecommendations } = useOperations();
  const { data: workloads, loading: workloadsLoading, range, refresh } = useResourceWorkload(undefined, "week");
  const assistantId = "workload-balancer";

  const guardrailMap = useMemo(() => {
    const entries = new Map<AssistantGuardrail["metric"], AssistantGuardrail>();
    assistantGuardrails.forEach((guardrail) => {
      entries.set(guardrail.metric, guardrail);
    });
    return entries;
  }, [assistantGuardrails]);

  useEffect(() => {
    if (workloadsLoading) {
      return;
    }

    const overloadGuardrail = guardrailMap.get("utilization_over");
    const underutilizedGuardrail = guardrailMap.get("utilization_under");
    const oooGuardrail = guardrailMap.get("ooo_overlap");

    const overloadThreshold = overloadGuardrail?.threshold ?? 110;
    const underutilizedThreshold = underutilizedGuardrail?.threshold ?? 70;
    const oooThreshold = oooGuardrail?.threshold ?? 4;

    const overloaded = workloads
      .filter((workload) => workload.utilization > overloadThreshold)
      .sort((a, b) => b.utilization - a.utilization);
    const underutilized = workloads
      .filter((workload) => workload.utilization < underutilizedThreshold)
      .sort((a, b) => a.utilization - b.utilization);

    const generatedSuggestions: Suggestion[] = [];

    const priorityWeight = (priority?: string | null) => {
      switch ((priority ?? "").toLowerCase()) {
        case "urgent":
          return 4;
        case "high":
          return 3;
        case "medium":
          return 2;
        case "low":
          return 1;
        default:
          return 0;
      }
    };

    const computeUtilization = (hours: number, capacity: number) => {
      if (capacity <= 0) return 0;
      return Math.max(0, Math.min(200, (hours / capacity) * 100));
    };

    if (overloaded.length > 0 && underutilized.length > 0) {
      const heavy = overloaded[0];
      const light = underutilized[0];

      const transferable = [...heavy.assignments]
        .filter((assignment) => (assignment.status ?? "").toLowerCase() !== "done")
        .sort((a, b) => {
          const priorityDiff = priorityWeight(a.priority) - priorityWeight(b.priority);
          if (priorityDiff !== 0) return priorityDiff;
          return (b.estimatedHours ?? 0) - (a.estimatedHours ?? 0);
        })
        .slice(0, 2);

      const hoursToMove = transferable.reduce((sum, assignment) => sum + (assignment.estimatedHours ?? 0), 0);
      const heavyProjected = computeUtilization(heavy.taskHours - hoursToMove, heavy.availableHours);
      const lightProjected = computeUtilization(light.taskHours + hoursToMove, light.availableHours);
      const guardrailId = overloadGuardrail?.id ?? "utilization.overload";

      if (transferable.length > 0) {
        generatedSuggestions.push({
          id: `${guardrailId}:${heavy.userId}:${light.userId}`,
          type: 'reassign',
          title: `Reassign ${transferable.length} task${transferable.length === 1 ? '' : 's'} from ${heavy.fullName} to ${light.fullName}`,
          description: `Shift lower risk work to ${light.fullName} to relieve ${heavy.fullName}'s load.`,
          impact: {
            utilizationDelta: Math.round(heavy.utilization - heavyProjected),
            deadlineRisk: transferable.reduce((risk, assignment) => {
              if (!assignment.dueDate) return risk;
              const dueSoon = new Date(assignment.dueDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 7;
              return risk + (dueSoon ? 10 : 4);
            }, 0),
            affected: transferable.length,
          },
          confidence: Math.min(95, Math.max(60, 100 - Math.abs(heavyProjected - lightProjected))),
          details: [
            `${heavy.fullName}: ${heavy.utilization.toFixed(0)}% → ${heavyProjected.toFixed(0)}%`,
            `${light.fullName}: ${light.utilization.toFixed(0)}% → ${lightProjected.toFixed(0)}%`,
            ...transferable.map((assignment) => {
              const dueLabel = assignment.dueDate ? format(new Date(assignment.dueDate), 'MMM d') : 'no due date';
              const hours = (assignment.estimatedHours ?? 0).toFixed(1);
              return `${assignment.title} • ${hours}h • due ${dueLabel}`;
            }),
          ],
          guardrailId,
          impactedUsers: [heavy.userId, light.userId],
        });
      }
    }

    workloads
      .filter((workload) => workload.oooHours >= oooThreshold && workload.oooWindows.length > 0)
      .forEach((workload) => {
        const conflictingAssignments = workload.assignments.filter((assignment) => {
          if (!assignment.dueDate) return false;
          const due = new Date(assignment.dueDate);
          return workload.oooWindows.some((window) =>
            isWithinInterval(due, { start: new Date(window.start), end: new Date(window.end) })
          );
        });

        if (conflictingAssignments.length === 0) {
          return;
        }

        const guardrailId = oooGuardrail?.id ?? "ooo.conflict";
        const highlighted = conflictingAssignments.slice(0, 3);
        generatedSuggestions.push({
          id: `${guardrailId}:${workload.userId}`,
          type: 'reschedule',
          title: `Reschedule ${highlighted.length} task${highlighted.length === 1 ? '' : 's'} for ${workload.fullName}`,
          description: `Upcoming time off overlaps planned work. Consider shifting deadlines or sharing ownership.`,
          impact: {
            utilizationDelta: 0,
            deadlineRisk: highlighted.length * 6,
            affected: highlighted.length,
          },
          confidence: 82,
          details: highlighted.map((assignment) => {
            const dueLabel = assignment.dueDate ? format(new Date(assignment.dueDate), 'MMM d') : 'no due date';
            return `${assignment.title} • due ${dueLabel}`;
          }),
          guardrailId,
          impactedUsers: [workload.userId],
        });
      });

    setSuggestions(generatedSuggestions);
    clearAssistantRecommendations(assistantId);
    generatedSuggestions.forEach((suggestion) => {
      recordAssistantRecommendation({
        id: suggestion.id,
        assistant: assistantId,
        guardrailId: suggestion.guardrailId,
        summary: suggestion.title,
        impactedUsers: suggestion.impactedUsers,
        metadata: {
          type: suggestion.type,
          confidence: suggestion.confidence,
          workloadRangeStart: range.start.toISOString(),
          workloadRangeEnd: range.end.toISOString(),
        },
      });
    });
    telemetry.track("assistant.suggestion_issued", {
      assistant: assistantId,
      suggestionCount: generatedSuggestions.length,
      guardrails: generatedSuggestions.map((suggestion) => suggestion.guardrailId),
    });
  }, [assistantId, clearAssistantRecommendations, guardrailMap, range.end, range.start, recordAssistantRecommendation, telemetry, workloads, workloadsLoading]);

  const loading = workloadsLoading;

  const applySuggestion = async (suggestionId: string) => {
    setApplying(suggestionId);
    
    // Simulate applying the suggestion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    setApplying(null);
  };

  const getTypeIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'reassign': return <Users className="h-4 w-4" />;
      case 'reschedule': return <Calendar className="h-4 w-4" />;
      case 'pair': return <Users className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getImpactColor = (delta: number) => {
    if (delta < -10) return 'text-green-600';
    if (delta < 0) return 'text-green-500';
    if (delta < 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <h2 className="font-semibold">Balancing Assistant</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Sparkles className="h-8 w-8 mx-auto animate-pulse text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing workload...
                </p>
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">All balanced!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No immediate workload issues detected
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} to improve balance
              </div>

              {suggestions.map(suggestion => (
                <Card key={suggestion.id} className="border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(suggestion.type)}
                        <CardTitle className="text-base">{suggestion.title}</CardTitle>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {suggestion.confidence}% confidence
                      </Badge>
                    </div>
                    <CardDescription>{suggestion.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Utilization</div>
                        <div className={`font-medium flex items-center gap-1 ${getImpactColor(suggestion.impact.utilizationDelta)}`}>
                          {suggestion.impact.utilizationDelta > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(suggestion.impact.utilizationDelta)}%
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Risk</div>
                        <div className={`font-medium flex items-center gap-1 ${getImpactColor(suggestion.impact.deadlineRisk)}`}>
                          {suggestion.impact.deadlineRisk > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(suggestion.impact.deadlineRisk)}%
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Affected</div>
                        <div className="font-medium">
                          {suggestion.impact.affected} {suggestion.impact.affected === 1 ? 'person' : 'people'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-medium">Details:</div>
                      <ul className="space-y-1">
                        {suggestion.details.map((detail, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => applySuggestion(suggestion.id)}
                        disabled={applying === suggestion.id}
                      >
                        {applying === suggestion.id ? 'Applying...' : 'Apply'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            void refresh();
          }}
          disabled={loading}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Refresh Suggestions
        </Button>
      </div>
    </div>
  );
}

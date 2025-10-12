import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X, TrendingDown, TrendingUp, Users, Calendar, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
}

interface BalancingAssistantProps {
  onClose: () => void;
}

export function BalancingAssistant({ onClose }: BalancingAssistantProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    generateSuggestions();
  }, []);

  const generateSuggestions = async () => {
    try {
      setLoading(true);
      
      // Fetch current workload hotspots
      const { data: assignments, error } = await supabase
        .from('task_assignees')
        .select(`
          task_id,
          user_id,
          tasks (
            id,
            title,
            estimated_hours,
            story_points,
            priority,
            due_date,
            project:projects(name)
          ),
          profiles:user_id (
            full_name
          )
        `);

      if (error) throw error;

      // Analyze and generate suggestions
      const mockSuggestions: Suggestion[] = [
        {
          id: '1',
          type: 'reassign',
          title: 'Reassign high-priority tasks',
          description: 'Move 2 tasks from overloaded team member to available capacity',
          impact: {
            utilizationDelta: -15,
            deadlineRisk: -25,
            affected: 2
          },
          confidence: 92,
          details: [
            'Alice Johnson (120% → 105%)',
            'Bob Smith (75% → 90%)',
            'Skill match: 95/100',
            'No dependency conflicts'
          ]
        },
        {
          id: '2',
          type: 'reschedule',
          title: 'Shift flexible tasks',
          description: 'Reschedule 3 medium-priority tasks by 1 week to smooth spike',
          impact: {
            utilizationDelta: -8,
            deadlineRisk: 0,
            affected: 3
          },
          confidence: 85,
          details: [
            'Tasks have 2-week flex window',
            'No hard deadlines affected',
            'Evens out week 15-16 load'
          ]
        },
        {
          id: '3',
          type: 'pair',
          title: 'Pair programming opportunity',
          description: 'Add pairing for mentorship and knowledge sharing',
          impact: {
            utilizationDelta: 5,
            deadlineRisk: -10,
            affected: 2
          },
          confidence: 78,
          details: [
            'New hire Carol (60% → 70%)',
            'Senior David (85% → 90%)',
            'Builds React expertise',
            '10% overhead for pairing'
          ]
        }
      ];

      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

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
          onClick={generateSuggestions}
          disabled={loading}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Refresh Suggestions
        </Button>
      </div>
    </div>
  );
}

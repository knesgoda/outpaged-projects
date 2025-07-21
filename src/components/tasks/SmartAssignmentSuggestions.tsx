import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { TeamMember } from "@/pages/TeamDirectory";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, Clock, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMemberStats {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  projects_count: number;
  tasks_completed: number;
  total_time_minutes: number;
  current_workload: number;
  skill_match_score: number;
  availability_score: number;
  performance_score: number;
  overall_score: number;
}

interface SmartAssignmentSuggestionsProps {
  taskType: string;
  taskPriority: string;
  projectId: string;
  onAssignMember: (userId: string) => void;
  className?: string;
}

export function SmartAssignmentSuggestions({
  taskType,
  taskPriority,
  projectId,
  onAssignMember,
  className
}: SmartAssignmentSuggestionsProps) {
  const { members, loading } = useTeamMembers();
  const [suggestions, setSuggestions] = useState<TeamMemberStats[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (members.length > 0) {
      analyzeMembersForTask();
    }
  }, [members, taskType, taskPriority]);

  const analyzeMembersForTask = async () => {
    setIsAnalyzing(true);
    try {
      const memberStats = await Promise.all(
        members.map(async (member) => {
          // Get member statistics
          const { data: stats } = await supabase.rpc('get_team_member_stats', {
            member_user_id: member.id
          });

          // Calculate current workload (active tasks)
          const { data: activeTasks } = await supabase
            .from('tasks')
            .select('id, priority')
            .eq('assignee_id', member.id)
            .not('status', 'eq', 'done')
            .not('status', 'eq', 'cancelled');

          // Calculate skill match score based on task type and member role
          const skillMatchScore = calculateSkillMatch(taskType, member.role);
          
          // Calculate availability score based on workload
          const workloadCount = activeTasks?.length || 0;
          const availabilityScore = Math.max(0, 100 - (workloadCount * 15));
          
          // Calculate performance score based on completion rate
          const completionRate = stats?.[0]?.tasks_completed || 0;
          const performanceScore = Math.min(100, completionRate * 5);
          
          // Calculate overall score with weights
          const overallScore = 
            (skillMatchScore * 0.4) + 
            (availabilityScore * 0.35) + 
            (performanceScore * 0.25);

          return {
            user_id: member.id,
            full_name: member.name || '',
            avatar_url: member.avatar,
            role: member.role,
            projects_count: stats?.[0]?.projects_count || 0,
            tasks_completed: stats?.[0]?.tasks_completed || 0,
            total_time_minutes: stats?.[0]?.total_time_minutes || 0,
            current_workload: workloadCount,
            skill_match_score: skillMatchScore,
            availability_score: availabilityScore,
            performance_score: performanceScore,
            overall_score: Math.round(overallScore)
          } as TeamMemberStats;
        })
      );

      // Sort by overall score descending
      const sortedSuggestions = memberStats.sort((a, b) => b.overall_score - a.overall_score);
      setSuggestions(sortedSuggestions);
    } catch (error) {
      console.error('Error analyzing members:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateSkillMatch = (taskType: string, memberRole: string): number => {
    const skillMatrix: Record<string, Record<string, number>> = {
      'feature_request': {
        'developer': 95,
        'senior_developer': 100,
        'tech_lead': 90,
        'designer': 20,
        'qa_engineer': 30,
        'project_manager': 15
      },
      'bug': {
        'developer': 85,
        'senior_developer': 95,
        'tech_lead': 100,
        'qa_engineer': 90,
        'designer': 10,
        'project_manager': 20
      },
      'design': {
        'designer': 100,
        'developer': 30,
        'senior_developer': 40,
        'tech_lead': 35,
        'qa_engineer': 15,
        'project_manager': 25
      },
      'research': {
        'project_manager': 85,
        'tech_lead': 80,
        'senior_developer': 70,
        'designer': 75,
        'developer': 50,
        'qa_engineer': 60
      },
      'testing': {
        'qa_engineer': 100,
        'developer': 70,
        'senior_developer': 75,
        'tech_lead': 80,
        'designer': 20,
        'project_manager': 30
      }
    };

    return skillMatrix[taskType]?.[memberRole] || 50;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  if (loading || isAnalyzing) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="w-4 h-4" />
            AI Assignment Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="w-4 h-4" />
          AI Assignment Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.slice(0, 4).map((member, index) => (
            <div
              key={member.user_id}
              className={cn(
                "flex items-start gap-3 p-3 border rounded-lg transition-all hover:shadow-sm",
                index === 0 && "ring-2 ring-primary/20 bg-primary/5"
              )}
            >
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {member.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {index === 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Star className="w-2 h-2 text-primary-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium truncate">
                      {member.full_name}
                      {index === 0 && (
                        <Badge variant="default" className="ml-2 text-xs">
                          Best Match
                        </Badge>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground capitalize">
                      {member.role.replace('_', ' ')}
                    </p>
                  </div>
                  <Badge 
                    variant={getScoreBadgeVariant(member.overall_score)}
                    className="text-xs"
                  >
                    {member.overall_score}%
                  </Badge>
                </div>
                
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className={getScoreColor(member.skill_match_score)}>
                      Skills: {member.skill_match_score}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className={getScoreColor(member.availability_score)}>
                      Available: {member.availability_score}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span className="text-muted-foreground">
                      {member.current_workload} tasks
                    </span>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center gap-2">
                  <Progress 
                    value={member.overall_score} 
                    className="flex-1 h-1"
                  />
                  <Button
                    size="sm"
                    variant={index === 0 ? "default" : "outline"}
                    onClick={() => onAssignMember(member.user_id)}
                    className="text-xs h-6 px-2"
                  >
                    Assign
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {suggestions.length === 0 && (
          <div className="text-center py-6">
            <Brain className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No team members found for this project
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
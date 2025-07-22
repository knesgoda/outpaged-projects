import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Trophy, 
  Star, 
  Target,
  Award
} from "lucide-react";
import { SkillDevelopment, useSkillDevelopment } from "@/hooks/useSkillDevelopment";

interface SkillProgressCardProps {
  skill: SkillDevelopment;
}

export const SkillProgressCard = ({ skill }: SkillProgressCardProps) => {
  const { getExperienceForNextLevel, getProgressToNextLevel } = useSkillDevelopment();

  const experienceToNext = getExperienceForNextLevel(skill);
  const progressPercentage = getProgressToNextLevel(skill);

  const getSkillIcon = (skillName: string) => {
    switch (skillName.toLowerCase()) {
      case 'leadership': return Trophy;
      case 'collaboration': return Target;
      case 'innovation': return Star;
      case 'efficiency': return TrendingUp;
      default: return Award;
    }
  };

  const getSkillColor = (skillName: string) => {
    switch (skillName.toLowerCase()) {
      case 'leadership': return "text-purple-600 bg-purple-100";
      case 'collaboration': return "text-green-600 bg-green-100";
      case 'innovation': return "text-orange-600 bg-orange-100";
      case 'efficiency': return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const SkillIcon = getSkillIcon(skill.skill_name);
  const skillColorClass = getSkillColor(skill.skill_name);

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${skillColorClass}`}>
              <SkillIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg capitalize">{skill.skill_name}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Level {skill.current_level}</span>
                <span>•</span>
                <span>{skill.experience_points} XP</span>
              </div>
            </div>
          </div>
          
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Level {skill.current_level}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress to Level {skill.current_level + 1}</span>
            <span className="font-medium">{experienceToNext} XP to go</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {progressPercentage.toFixed(1)}% complete
          </div>
        </div>

        {skill.milestones_achieved.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-1">
              <Trophy className="h-4 w-4 text-amber-500" />
              Milestones ({skill.milestones_achieved.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {skill.milestones_achieved.slice(0, 3).map((milestone, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {milestone}
                </Badge>
              ))}
              {skill.milestones_achieved.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{skill.milestones_achieved.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Last activity:</span>{" "}
          {new Date(skill.last_activity_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
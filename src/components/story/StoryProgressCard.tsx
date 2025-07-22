import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, Clock, Trophy } from "lucide-react";
import { useStoryProgression } from "@/hooks/useStoryProgression";

interface StoryProgressCardProps {
  narrativeId: string;
  narrativeTitle: string;
  totalChapters: number;
  estimatedTime: number;
  difficulty: number;
  onContinue: () => void;
}

export const StoryProgressCard = ({
  narrativeId,
  narrativeTitle,
  totalChapters,
  estimatedTime,
  difficulty,
  onContinue,
}: StoryProgressCardProps) => {
  const { progression, loading } = useStoryProgression(narrativeId);

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return "bg-emerald-500";
      case 2: return "bg-blue-500";
      case 3: return "bg-amber-500";
      case 4: return "bg-orange-500";
      case 5: return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 1: return "Beginner";
      case 2: return "Easy";
      case 3: return "Medium";
      case 4: return "Hard";
      case 5: return "Expert";
      default: return "Unknown";
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedChapters = progression?.chapters_completed.length || 0;
  const progressPercentage = progression?.completion_percentage || 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {narrativeTitle}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge 
                variant="secondary" 
                className={`${getDifficultyColor(difficulty)} text-white border-none`}
              >
                <Star className="h-3 w-3 mr-1" />
                {getDifficultyLabel(difficulty)}
              </Badge>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(estimatedTime / 60)}h
              </div>
            </div>
          </div>
          {progression?.is_completed && (
            <Trophy className="h-5 w-5 text-amber-500" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedChapters} / {totalChapters} chapters
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {progressPercentage.toFixed(1)}% complete
          </div>
        </div>

        {progression && !progression.is_completed && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Last activity:</span>{" "}
            {new Date(progression.last_activity_at).toLocaleDateString()}
          </div>
        )}

        <Button 
          onClick={onContinue}
          className="w-full group-hover:scale-105 transition-transform"
          variant={progression?.is_completed ? "outline" : "default"}
        >
          {progression?.is_completed 
            ? "Review Story" 
            : progression 
            ? "Continue Story" 
            : "Start Story"
          }
        </Button>
      </CardContent>
    </Card>
  );
};
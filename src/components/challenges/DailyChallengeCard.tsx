import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  Trophy, 
  Users, 
  Lightbulb, 
  CheckCircle, 
  Clock,
  Coins,
  Star
} from "lucide-react";
import { useDailyChallenges, DailyChallenge } from "@/hooks/useDailyChallenges";

interface DailyChallengeCardProps {
  challenge: DailyChallenge;
  onComplete?: (challengeId: string) => void;
}

export const DailyChallengeCard = ({ challenge, onComplete }: DailyChallengeCardProps) => {
  const { isChallengeCompleted, completeChallenge } = useDailyChallenges();
  const isCompleted = isChallengeCompleted(challenge.id);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sprint': return Target;
      case 'milestone': return Trophy;
      case 'collaboration': return Users;
      case 'innovation': return Lightbulb;
      case 'completion': return CheckCircle;
      default: return Target;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sprint': return "bg-blue-500";
      case 'milestone': return "bg-purple-500";
      case 'collaboration': return "bg-green-500";
      case 'innovation': return "bg-orange-500";
      case 'completion': return "bg-indigo-500";
      default: return "bg-gray-500";
    }
  };

  const getDifficultyStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < level ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
      />
    ));
  };

  const handleComplete = async () => {
    if (isCompleted) return;
    
    const result = await completeChallenge(challenge.id);
    if (result && onComplete) {
      onComplete(challenge.id);
    }
  };

  const timeRemaining = new Date(challenge.expires_at).getTime() - Date.now();
  const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));

  const TypeIcon = getTypeIcon(challenge.challenge_type);

  return (
    <Card className={`transition-all duration-300 ${isCompleted ? 'border-emerald-500 bg-emerald-50/50' : 'hover:shadow-lg'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${getTypeColor(challenge.challenge_type)} text-white`}>
                <TypeIcon className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg">{challenge.title}</CardTitle>
              {isCompleted && (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Badge variant="outline" className="capitalize">
                {challenge.challenge_type.replace('_', ' ')}
              </Badge>
              
              <div className="flex items-center gap-1">
                {getDifficultyStars(challenge.difficulty_level)}
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {hoursRemaining}h left
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {challenge.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-amber-600">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium">{challenge.rewards?.experience || 0} XP</span>
            </div>
            <div className="flex items-center gap-1 text-blue-600">
              <Coins className="h-4 w-4" />
              <span className="font-medium">{challenge.rewards?.points || 0} pts</span>
            </div>
          </div>

          <Button 
            onClick={handleComplete}
            disabled={isCompleted}
            variant={isCompleted ? "outline" : "default"}
            size="sm"
            className="transition-all duration-300"
          >
            {isCompleted ? "Completed" : "Complete"}
          </Button>
        </div>

        {challenge.requirements && Object.keys(challenge.requirements).length > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <strong>Requirements:</strong> {JSON.stringify(challenge.requirements)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
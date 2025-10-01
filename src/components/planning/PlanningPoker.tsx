import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface PlanningPokerProps {
  taskTitle: string;
  taskDescription?: string;
  participants: Participant[];
  onEstimateComplete?: (estimate: number) => void;
}

const FIBONACCI_CARDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export function PlanningPoker({ 
  taskTitle, 
  taskDescription, 
  participants, 
  onEstimateComplete 
}: PlanningPokerProps) {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [participantVotes, setParticipantVotes] = useState<Record<string, number>>({});

  const handleCardSelect = (value: number) => {
    setSelectedCard(value);
    // Simulate other participants voting
    const newVotes: Record<string, number> = {};
    participants.forEach(p => {
      if (p.id !== "current-user") {
        const randomCard = FIBONACCI_CARDS[Math.floor(Math.random() * FIBONACCI_CARDS.length)];
        newVotes[p.id] = randomCard;
      }
    });
    newVotes["current-user"] = value;
    setParticipantVotes(newVotes);
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleReset = () => {
    setSelectedCard(null);
    setRevealed(false);
    setParticipantVotes({});
  };

  const calculateConsensus = () => {
    const votes = Object.values(participantVotes);
    if (votes.length === 0) return null;
    
    const sum = votes.reduce((acc, val) => acc + val, 0);
    const avg = sum / votes.length;
    
    // Find closest Fibonacci number
    return FIBONACCI_CARDS.reduce((prev, curr) => 
      Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev
    );
  };

  const consensus = calculateConsensus();
  const allVoted = Object.keys(participantVotes).length === participants.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Planning Poker Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">{taskTitle}</h3>
            {taskDescription && (
              <p className="text-muted-foreground text-sm">{taskDescription}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Participants:</span>
            <div className="flex -space-x-2">
              {participants.map(p => (
                <Avatar 
                  key={p.id} 
                  className={cn(
                    "border-2 border-background",
                    participantVotes[p.id] && "ring-2 ring-primary"
                  )}
                >
                  <AvatarImage src={p.avatarUrl} />
                  <AvatarFallback>{p.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Your Estimate</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!selectedCard}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleReveal}
                disabled={!allVoted || revealed}
              >
                <Check className="h-4 w-4 mr-2" />
                Reveal Votes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {FIBONACCI_CARDS.map(value => (
              <Button
                key={value}
                variant={selectedCard === value ? "default" : "outline"}
                className={cn(
                  "h-20 text-2xl font-bold transition-all",
                  selectedCard === value && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => handleCardSelect(value)}
                disabled={revealed}
              >
                {value}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {revealed && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {participants.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-2">
                  <Avatar>
                    <AvatarImage src={p.avatarUrl} />
                    <AvatarFallback>{p.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge variant="secondary" className="text-lg">
                    {participantVotes[p.id] || "?"}
                  </Badge>
                </div>
              ))}
            </div>

            {consensus && (
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Suggested Consensus</p>
                    <p className="text-3xl font-bold text-primary">{consensus} Story Points</p>
                  </div>
                  <Button onClick={() => onEstimateComplete?.(consensus)}>
                    Accept Estimate
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

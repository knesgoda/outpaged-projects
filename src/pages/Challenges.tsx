
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Trophy, Users, Calendar, Plus, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DailyChallengeCard } from "@/components/challenges/DailyChallengeCard";
import { CreateChallengeDialog } from "@/components/challenges/CreateChallengeDialog";
import { useDailyChallenges } from "@/hooks/useDailyChallenges";
import { supabase } from "@/integrations/supabase/client";

export default function Challenges() {
  const { toast } = useToast();
  const { challenges, completions, loading, getTodaysCompletions } = useDailyChallenges();
  const [communityChallenges, setCommunityChallenges] = useState<any[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  useEffect(() => {
    fetchCommunityChallenges();
  }, []);

  const fetchCommunityChallenges = async () => {
    try {
      setCommunityLoading(true);
      const { data, error } = await supabase
        .from('community_challenges')
        .select(`
          *,
          profiles:created_by (
            full_name
          )
        `)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunityChallenges(data || []);
    } catch (error) {
      console.error('Error fetching community challenges:', error);
      toast({
        title: "Error",
        description: "Failed to load community challenges",
        variant: "destructive",
      });
    } finally {
      setCommunityLoading(false);
    }
  };

  const todaysCompletions = getTodaysCompletions();
  const completionRate = challenges.length > 0 ? (todaysCompletions.length / challenges.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="w-8 h-8" />
            Challenges
          </h1>
          <p className="text-muted-foreground">
            Complete daily challenges and join community competitions
          </p>
        </div>
        <CreateChallengeDialog onChallengeCreated={fetchCommunityChallenges} />
      </div>

      {/* Challenge Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysCompletions.length}</div>
            <p className="text-xs text-muted-foreground">
              of {challenges.length} challenges completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Daily completion rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">XP Earned Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todaysCompletions.reduce((sum, c) => sum + c.experience_earned, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Experience points</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Days in a row</p>
          </CardContent>
        </Card>
      </div>

      {/* Challenge Tabs */}
      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-fit">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Daily Challenges
          </TabsTrigger>
          <TabsTrigger value="community" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Community Challenges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
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
              ))}
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Daily Challenges</h3>
              <p className="text-muted-foreground mb-4">
                Check back tomorrow for new daily challenges
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {challenges.map((challenge) => (
                <DailyChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="community" className="space-y-4">
          {communityLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
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
              ))}
            </div>
          ) : communityChallenges.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Community Challenges</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to create a community challenge
              </p>
              <CreateChallengeDialog onChallengeCreated={fetchCommunityChallenges}>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Challenge
                </Button>
              </CreateChallengeDialog>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communityChallenges.map((challenge) => (
                <Card key={challenge.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <CardDescription className="mt-1">
                          By {challenge.profiles?.full_name || 'Anonymous'}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary">
                          {challenge.current_participants} / {challenge.max_participants || '∞'} participants
                        </Badge>
                        <Badge variant="outline">
                          Difficulty: {challenge.difficulty_level}/5
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {challenge.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">Ends:</span>{" "}
                        {new Date(challenge.end_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-amber-600">
                          <Trophy className="w-3 h-3 mr-1" />
                          {challenge.experience_reward} XP
                        </Badge>
                      </div>
                    </div>

                    <Button className="w-full">
                      Join Challenge
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

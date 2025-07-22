
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Crown, Star, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  id: string;
  rank: number;
  score: number;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

export default function Leaderboards() {
  const { toast } = useToast();
  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<string>('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  useEffect(() => {
    if (selectedLeaderboard) {
      fetchLeaderboardEntries(selectedLeaderboard);
    }
  }, [selectedLeaderboard]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leaderboards')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const leaderboardsData = data || [];
      setLeaderboards(leaderboardsData);
      
      if (leaderboardsData.length > 0) {
        setSelectedLeaderboard(leaderboardsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboardEntries = async (leaderboardId: string) => {
    try {
      setEntriesLoading(true);
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select(`
          *,
          profiles:user_id (
            full_name
          )
        `)
        .eq('leaderboard_id', leaderboardId)
        .order('rank', { ascending: true })
        .limit(50);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard entries:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard entries",
        variant: "destructive",
      });
    } finally {
      setEntriesLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">#{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return "default";
      case 2:
        return "secondary";
      case 3:
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8" />
            Leaderboards
          </h1>
          <p className="text-muted-foreground">
            See how you rank against other team members
          </p>
        </div>
      </div>

      {leaderboards.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Leaderboards Available</h3>
          <p className="text-muted-foreground mb-4">
            Leaderboards will appear here once they are created
          </p>
        </div>
      ) : (
        <>
          {/* Leaderboard Selection */}
          <Tabs value={selectedLeaderboard} onValueChange={setSelectedLeaderboard} className="space-y-6">
            <TabsList className="grid grid-cols-1 md:grid-cols-4 w-fit">
              {leaderboards.slice(0, 4).map((leaderboard) => (
                <TabsTrigger key={leaderboard.id} value={leaderboard.id} className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {leaderboard.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {leaderboards.map((leaderboard) => (
              <TabsContent key={leaderboard.id} value={leaderboard.id} className="space-y-6">
                {/* Leaderboard Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      {leaderboard.name}
                    </CardTitle>
                    <CardDescription>
                      {leaderboard.description} • Tracking: {leaderboard.metric} • Period: {leaderboard.time_period}
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Top 3 */}
                {entries.length >= 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {entries.slice(0, 3).map((entry, index) => (
                      <Card key={entry.id} className={`relative ${index === 0 ? 'ring-2 ring-yellow-500' : ''}`}>
                        <CardHeader className="text-center">
                          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-2">
                            {getRankIcon(entry.rank)}
                          </div>
                          <CardTitle className="text-lg">
                            {entry.profiles?.full_name || 'Anonymous'}
                          </CardTitle>
                          <Badge variant={getRankBadgeVariant(entry.rank)}>
                            Rank #{entry.rank}
                          </Badge>
                        </CardHeader>
                        <CardContent className="text-center">
                          <div className="text-2xl font-bold">{entry.score.toLocaleString()}</div>
                          <p className="text-sm text-muted-foreground">{leaderboard.metric}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Full Leaderboard */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Full Rankings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {entriesLoading ? (
                      <div className="space-y-3">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="animate-pulse flex items-center space-x-4">
                            <div className="w-8 h-8 bg-muted rounded-full"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-1/4"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                            <div className="h-4 bg-muted rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    ) : entries.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No entries yet for this leaderboard</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {entries.map((entry, index) => (
                          <div
                            key={entry.id}
                            className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                              index < 3 ? 'bg-muted/30' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 flex items-center justify-center">
                                {getRankIcon(entry.rank)}
                              </div>
                              <Avatar className="w-8 h-8">
                                <AvatarFallback>
                                  {entry.profiles?.full_name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {entry.profiles?.full_name || 'Anonymous'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Rank #{entry.rank}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{entry.score.toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">
                                {leaderboard.metric}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  );
}

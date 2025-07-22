import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, BookOpen, Trophy, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useStoryProgression } from "@/hooks/useStoryProgression";

interface StoryReaderProps {
  narrativeId: string;
  onClose: () => void;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  experience_reward: number;
  estimated_duration_minutes: number;
  rewards: any;
}

export function StoryReader({ narrativeId, onClose }: StoryReaderProps) {
  const { toast } = useToast();
  const { progression, createProgression, completeChapter, makeChoice, loading: progressionLoading } = useStoryProgression(narrativeId);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState<any>(null);

  useEffect(() => {
    fetchStoryData();
  }, [narrativeId]);

  useEffect(() => {
    if (progression && chapters.length > 0) {
      // Find current chapter index based on progression
      const currentChapter = chapters.find(c => c.id === progression.current_chapter_id);
      if (currentChapter) {
        setCurrentChapterIndex(currentChapter.chapter_number - 1);
      }
    }
  }, [progression, chapters]);

  const fetchStoryData = async () => {
    try {
      setLoading(true);

      // Fetch narrative details
      const { data: narrativeData, error: narrativeError } = await supabase
        .from('story_narratives')
        .select('*')
        .eq('id', narrativeId)
        .single();

      if (narrativeError) throw narrativeError;
      setNarrative(narrativeData);

      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('story_chapters')
        .select('*')
        .eq('narrative_id', narrativeId)
        .order('chapter_number');

      if (chaptersError) throw chaptersError;
      setChapters(chaptersData || []);

      // Create progression if it doesn't exist
      if (!progression && chaptersData?.length > 0) {
        await createProgression(narrativeId);
      }
    } catch (error) {
      console.error('Error fetching story data:', error);
      toast({
        title: "Error",
        description: "Failed to load story content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteChapter = async () => {
    const currentChapter = chapters[currentChapterIndex];
    if (!currentChapter || !progression) return;

    try {
      await completeChapter(currentChapter.id);
      
      toast({
        title: "Chapter Completed!",
        description: `You earned ${currentChapter.experience_reward} XP`,
      });

      // Move to next chapter if available
      if (currentChapterIndex < chapters.length - 1) {
        setCurrentChapterIndex(currentChapterIndex + 1);
      }
    } catch (error) {
      console.error('Error completing chapter:', error);
      toast({
        title: "Error",
        description: "Failed to complete chapter",
        variant: "destructive",
      });
    }
  };

  const isChapterCompleted = (chapterIndex: number) => {
    const chapter = chapters[chapterIndex];
    return progression?.chapters_completed?.includes(chapter?.id) || false;
  };

  const canAccessChapter = (chapterIndex: number) => {
    if (chapterIndex === 0) return true;
    return isChapterCompleted(chapterIndex - 1);
  };

  if (loading || progressionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!narrative || chapters.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Story Not Found</h3>
        <p className="text-muted-foreground mb-4">
          This story doesn't exist or has no chapters
        </p>
        <Button onClick={onClose}>Go Back</Button>
      </div>
    );
  }

  const currentChapter = chapters[currentChapterIndex];
  const completionPercentage = progression?.completion_percentage || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onClose}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Stories
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{narrative.title}</h1>
          <p className="text-muted-foreground">
            Chapter {currentChapterIndex + 1} of {chapters.length}
          </p>
        </div>
        <div className="w-20"> {/* Spacer */}</div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Story Progress</span>
              <span>{completionPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Chapter Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {chapters.map((chapter, index) => (
          <Button
            key={chapter.id}
            variant={index === currentChapterIndex ? "default" : "outline"}
            size="sm"
            disabled={!canAccessChapter(index)}
            onClick={() => setCurrentChapterIndex(index)}
            className="flex-shrink-0"
          >
            <div className="flex items-center gap-1">
              <span>{index + 1}</span>
              {isChapterCompleted(index) && (
                <Trophy className="w-3 h-3 text-yellow-500" />
              )}
            </div>
          </Button>
        ))}
      </div>

      {/* Chapter Content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{currentChapter.title}</CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {currentChapter.estimated_duration_minutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  {currentChapter.experience_reward} XP
                </span>
              </CardDescription>
            </div>
            {isChapterCompleted(currentChapterIndex) && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-base leading-relaxed">
              {currentChapter.content}
            </div>
          </div>

          {/* Chapter Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentChapterIndex(Math.max(0, currentChapterIndex - 1))}
              disabled={currentChapterIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Chapter
            </Button>

            <div className="flex gap-2">
              {!isChapterCompleted(currentChapterIndex) && (
                <Button onClick={handleCompleteChapter}>
                  Complete Chapter
                </Button>
              )}
              
              <Button
                variant={isChapterCompleted(currentChapterIndex) ? "default" : "outline"}
                onClick={() => setCurrentChapterIndex(Math.min(chapters.length - 1, currentChapterIndex + 1))}
                disabled={currentChapterIndex === chapters.length - 1 || !canAccessChapter(currentChapterIndex + 1)}
              >
                Next Chapter
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chapter Rewards */}
      {currentChapter.rewards && Object.keys(currentChapter.rewards).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chapter Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(currentChapter.rewards).map(([key, value]) => (
                <div key={key} className="text-center p-3 border rounded-lg">
                  <div className="font-semibold">{value as string}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {key.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
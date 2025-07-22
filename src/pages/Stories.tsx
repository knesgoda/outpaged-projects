
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, Filter, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StoryProgressCard } from "@/components/story/StoryProgressCard";
import { useStoryProgression } from "@/hooks/useStoryProgression";

export default function Stories() {
  const { toast } = useToast();
  const [narratives, setNarratives] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoriesData();
  }, []);

  const fetchStoriesData = async () => {
    try {
      setLoading(true);
      
      // Fetch story narratives
      const { data: narrativesData, error: narrativesError } = await supabase
        .from('story_narratives')
        .select(`
          *,
          story_themes (
            name,
            category,
            color_scheme
          )
        `)
        .order('created_at', { ascending: false });

      if (narrativesError) throw narrativesError;

      // Fetch story themes
      const { data: themesData, error: themesError } = await supabase
        .from('story_themes')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (themesError) throw themesError;

      setNarratives(narrativesData || []);
      setThemes(themesData || []);
    } catch (error) {
      console.error('Error fetching stories data:', error);
      toast({
        title: "Error",
        description: "Failed to load stories data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredNarratives = narratives.filter(narrative => {
    const matchesSearch = narrative.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         narrative.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTheme = selectedTheme === "all" || narrative.story_themes?.category === selectedTheme;
    return matchesSearch && matchesTheme;
  });

  const handleContinueStory = (narrativeId: string) => {
    // Navigate to story reading interface (to be implemented)
    toast({
      title: "Story Navigation",
      description: "Story reading interface coming soon!",
    });
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
            <BookOpen className="w-8 h-8" />
            Stories
          </h1>
          <p className="text-muted-foreground">
            Discover and engage with interactive project narratives
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Create Story
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            <option value="all">All Themes</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.category}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Story Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNarratives.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Stories Available</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedTheme !== "all" 
                ? "No stories match your current filters"
                : "Start by creating your first interactive story"
              }
            </p>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Story
            </Button>
          </div>
        ) : (
          filteredNarratives.map((narrative) => (
            <StoryProgressCard
              key={narrative.id}
              narrativeId={narrative.id}
              narrativeTitle={narrative.title}
              totalChapters={narrative.total_chapters}
              estimatedTime={narrative.estimated_completion_time}
              difficulty={narrative.difficulty_level}
              onContinue={() => handleContinueStory(narrative.id)}
            />
          ))
        )}
      </div>

      {/* Story Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{narratives.length}</div>
            <p className="text-xs text-muted-foreground">Available narratives</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {narratives.filter(n => n.completion_percentage > 0 && n.completion_percentage < 100).length}
            </div>
            <p className="text-xs text-muted-foreground">Active stories</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {narratives.filter(n => n.completion_percentage === 100).length}
            </div>
            <p className="text-xs text-muted-foreground">Finished stories</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{themes.length}</div>
            <p className="text-xs text-muted-foreground">Available themes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  hierarchy_level?: string;
  status?: string;
  story_points?: number;
  parent_id?: string;
}

interface StoryMapProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onAddTask?: (parentId?: string) => void;
}

export function StoryMap({ tasks, onTaskClick, onAddTask }: StoryMapProps) {
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  const toggleEpic = (epicId: string) => {
    const newExpanded = new Set(expandedEpics);
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId);
    } else {
      newExpanded.add(epicId);
    }
    setExpandedEpics(newExpanded);
  };

  // Build hierarchy: Epics -> Stories -> Tasks
  const epics = tasks.filter(t => t.hierarchy_level === "epic");
  
  const getStoriesForEpic = (epicId: string) => {
    return tasks.filter(t => t.parent_id === epicId && t.hierarchy_level === "story");
  };

  const getTasksForStory = (storyId: string) => {
    return tasks.filter(t => t.parent_id === storyId && t.hierarchy_level === "task");
  };

  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      todo: "bg-slate-500/10 text-slate-500",
      in_progress: "bg-blue-500/10 text-blue-500",
      in_review: "bg-yellow-500/10 text-yellow-500",
      done: "bg-green-500/10 text-green-500",
    };
    return colors[status || "todo"] || colors.todo;
  };

  const calculateProgress = (epicId: string) => {
    const stories = getStoriesForEpic(epicId);
    const allTasks: Task[] = [];
    stories.forEach(story => {
      allTasks.push(...getTasksForStory(story.id));
    });
    
    if (allTasks.length === 0) return 0;
    const completed = allTasks.filter(t => t.status === "done").length;
    return Math.round((completed / allTasks.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Story Map</h2>
          <p className="text-muted-foreground">Visualize your product roadmap</p>
        </div>
        <Button onClick={() => onAddTask?.()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Epic
        </Button>
      </div>

      <div className="space-y-4">
        {epics.map(epic => {
          const isExpanded = expandedEpics.has(epic.id);
          const stories = getStoriesForEpic(epic.id);
          const progress = calculateProgress(epic.id);

          return (
            <Card key={epic.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleEpic(epic.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <div>
                      <CardTitle className="text-lg">{epic.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                          Epic
                        </Badge>
                        <Badge variant="outline" className={cn(getStatusColor(epic.status))}>
                          {epic.status?.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {stories.length} stories • {progress}% complete
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddTask?.(epic.id);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Story
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stories.map(story => {
                      const storyTasks = getTasksForStory(story.id);
                      const storyPoints = storyTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);

                      return (
                        <Card 
                          key={story.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => onTaskClick?.(story.id)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base">{story.title}</CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 text-xs">
                                    Story
                                  </Badge>
                                  <Badge variant="outline" className={cn("text-xs", getStatusColor(story.status))}>
                                    {story.status?.replace(/_/g, " ")}
                                  </Badge>
                                </div>
                              </div>
                              {storyPoints > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                  {storyPoints} pts
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {storyTasks.length > 0 ? (
                                <div className="text-sm text-muted-foreground">
                                  {storyTasks.length} tasks
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddTask?.(story.id);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-2" />
                                  Add Task
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

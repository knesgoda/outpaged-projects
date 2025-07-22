import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FolderOpen, 
  CheckSquare, 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock,
  ArrowRight,
  Plus,
  BookOpen,
  Trophy,
  Target,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { StoryProgressCard } from "@/components/story/StoryProgressCard";
import { DailyChallengeCard } from "@/components/challenges/DailyChallengeCard";
import { SkillProgressCard } from "@/components/skills/SkillProgressCard";
import { useDailyChallenges } from "@/hooks/useDailyChallenges";
import { useSkillDevelopment } from "@/hooks/useSkillDevelopment";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { challenges, loading: challengesLoading } = useDailyChallenges();
  const { skills, loading: skillsLoading } = useSkillDevelopment();
  
  const [stats, setStats] = useState({
    projects: 0,
    tasks: 0,
    completedTasks: 0,
    activeProjects: 0
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [storyNarratives, setStoryNarratives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch story narratives
      const { data: narratives, error: narrativesError } = await supabase
        .from('story_narratives')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (narrativesError) throw narrativesError;

      // Calculate stats
      const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;

      setStats({
        projects: projects?.length || 0,
        tasks: tasks?.length || 0,
        completedTasks,
        activeProjects
      });

      setRecentProjects(projects?.slice(0, 3) || []);
      setRecentTasks(tasks?.slice(0, 5) || []);
      setStoryNarratives(narratives || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'default';
      case 'completed':
      case 'done':
        return 'secondary';
      case 'on_hold':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const statCards = [
    {
      title: "Total Projects",
      value: stats.projects,
      description: `${stats.activeProjects} active`,
      icon: FolderOpen,
      color: "text-primary",
      onClick: () => navigate('/dashboard/projects')
    },
    {
      title: "Total Tasks",
      value: stats.tasks,
      description: `${stats.completedTasks} completed`,
      icon: CheckSquare,
      color: "text-success",
      onClick: () => navigate('/dashboard/tasks')
    },
    {
      title: "Team Members",
      value: 1,
      description: "Active members",
      icon: Users,
      color: "text-accent",
      onClick: () => navigate('/dashboard/team')
    },
    {
      title: "This Week",
      value: stats.tasks,
      description: "Tasks created",
      icon: Calendar,
      color: "text-warning",
      onClick: () => navigate('/dashboard/analytics')
    }
  ];

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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your project overview.</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => navigate('/dashboard/projects')}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card 
            key={card.title} 
            className="hover:shadow-soft transition-all cursor-pointer"
            onClick={card.onClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gamification Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Challenges */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Daily Challenges
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/challenges')}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {challengesLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ) : challenges.length > 0 ? (
              <div className="space-y-3">
                {challenges.slice(0, 2).map((challenge) => (
                  <div key={challenge.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{challenge.title}</p>
                        <p className="text-xs text-muted-foreground">{challenge.difficulty_level} stars</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {challenge.rewards?.points || 0} pts
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active challenges</p>
            )}
          </CardContent>
        </Card>

        {/* Skill Development */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Skills Progress
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/skills')}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {skillsLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ) : skills.length > 0 ? (
              <div className="space-y-3">
                {skills.slice(0, 2).map((skill) => (
                  <div key={skill.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm capitalize">{skill.skill_name}</p>
                        <p className="text-xs text-muted-foreground">Level {skill.current_level}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {skill.experience_points} XP
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No skills tracked yet</p>
            )}
          </CardContent>
        </Card>

        {/* Story Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Story Progress
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/stories')}
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {storyNarratives.length > 0 ? (
              <div className="space-y-3">
                {storyNarratives.slice(0, 2).map((narrative) => (
                  <div key={narrative.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{narrative.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {narrative.completion_percentage}% complete
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Chapter {narrative.current_chapter}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No stories started</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions />
        </div>

        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  Recent Projects
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard/projects')}
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No projects yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate('/dashboard/projects')}
                    >
                      Create Your First Project
                    </Button>
                  </div>
                ) : (
                  recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(project.status)}>
                        {formatStatus(project.status)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Recent Tasks
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/tasks')}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => navigate('/dashboard/tasks')}
                >
                  Create Your First Task
                </Button>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/dashboard/tasks')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-success rounded-full" />
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.projects?.name || "Unknown Project"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(task.status)}>
                    {formatStatus(task.status)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

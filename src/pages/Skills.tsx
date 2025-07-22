
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Award, Target, Star, Plus, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SkillProgressCard } from "@/components/skills/SkillProgressCard";
import { useSkillDevelopment } from "@/hooks/useSkillDevelopment";

export default function Skills() {
  const { toast } = useToast();
  const { skills, loading, addExperience, addMilestone } = useSkillDevelopment();

  const totalExperience = skills.reduce((sum, skill) => sum + skill.experience_points, 0);
  const averageLevel = skills.length > 0 ? skills.reduce((sum, skill) => sum + skill.current_level, 0) / skills.length : 0;
  const totalMilestones = skills.reduce((sum, skill) => sum + skill.milestones_achieved.length, 0);

  const skillCategories = [
    { name: 'Technical', skills: skills.filter(s => ['coding', 'development', 'testing'].includes(s.skill_name.toLowerCase())) },
    { name: 'Leadership', skills: skills.filter(s => ['leadership', 'management', 'mentoring'].includes(s.skill_name.toLowerCase())) },
    { name: 'Collaboration', skills: skills.filter(s => ['collaboration', 'communication', 'teamwork'].includes(s.skill_name.toLowerCase())) },
    { name: 'Innovation', skills: skills.filter(s => ['innovation', 'creativity', 'problem-solving'].includes(s.skill_name.toLowerCase())) },
  ];

  const handleAddExperience = async (skillName: string, amount: number) => {
    await addExperience(skillName, amount);
    toast({
      title: "Experience Added",
      description: `Added ${amount} XP to ${skillName}`,
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
            <TrendingUp className="w-8 h-8" />
            Skills Development
          </h1>
          <p className="text-muted-foreground">
            Track your progress and develop your professional skills
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Skill
        </Button>
      </div>

      {/* Skills Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExperience.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">XP earned</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageLevel.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Across all skills</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skills.length}</div>
            <p className="text-xs text-muted-foreground">Skills being tracked</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMilestones}</div>
            <p className="text-xs text-muted-foreground">Achievements unlocked</p>
          </CardContent>
        </Card>
      </div>

      {/* Skills Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-fit">
          <TabsTrigger value="all">All Skills</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="leadership">Leadership</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="innovation">Innovation</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {skills.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Skills Tracked Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your skills to see your professional development
              </p>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Skill
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <SkillProgressCard key={skill.id} skill={skill} />
              ))}
            </div>
          )}
        </TabsContent>

        {skillCategories.map((category) => (
          <TabsContent key={category.name.toLowerCase()} value={category.name.toLowerCase()} className="space-y-4">
            {category.skills.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No {category.name} Skills</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking {category.name.toLowerCase()} skills to see your progress
                </p>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add {category.name} Skill
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.skills.map((skill) => (
                  <SkillProgressCard key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {skills
              .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
              .slice(0, 5)
              .map((skill) => (
                <div key={skill.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{skill.skill_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last updated {new Date(skill.last_activity_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">Level {skill.current_level}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {skill.experience_points} XP
                    </p>
                  </div>
                </div>
              ))}
            {skills.length === 0 && (
              <p className="text-center text-muted-foreground py-6">
                No skill activity yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

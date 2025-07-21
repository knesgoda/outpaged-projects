import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, MoreHorizontal, FolderOpen, Calendar, Users, CheckSquare2 } from "lucide-react";
import { ProjectDialog } from "@/components/projects/ProjectDialog";

const projects: any[] = [];

export default function Projects() {
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and track progress</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => setIsProjectDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.name} className={`${project.color} hover:shadow-soft transition-all cursor-pointer`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg text-foreground">{project.name}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-sm">
                {project.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status and task count */}
              <div className="flex items-center justify-between">
                <Badge variant={project.status === 'Active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckSquare2 className="w-4 h-4" />
                  <span>{project.completed}/{project.tasks} Tasks</span>
                </div>
              </div>

              {/* Team avatars */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div className="flex -space-x-2">
                    {project.team.slice(0, 3).map((member, index) => (
                      <Avatar key={index} className="w-6 h-6 border-2 border-background">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                      </Avatar>
                    ))}
                    {project.team.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">+{project.team.length - 3}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {project.dueDate}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Project Card */}
        <Card 
          className="border-dashed border-2 border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
          onClick={() => setIsProjectDialogOpen(true)}
        >
          <CardContent className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center space-y-2">
              <Plus className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="font-medium text-foreground">Create New Project</h3>
              <p className="text-sm text-muted-foreground">Start organizing your work</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Dialog */}
      <ProjectDialog 
        isOpen={isProjectDialogOpen}
        onClose={() => setIsProjectDialogOpen(false)}
        onSuccess={() => {
          // Project was created successfully
          // In a real app, you'd refresh the projects list here
        }}
      />
    </div>
  );
}
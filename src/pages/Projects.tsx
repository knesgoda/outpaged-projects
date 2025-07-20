import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, FolderOpen, Calendar, Users } from "lucide-react";

const projects = [
  {
    name: "Website Redesign",
    description: "Complete overhaul of company website with modern design",
    status: "In Progress",
    progress: 75,
    dueDate: "Dec 15, 2024",
    team: 5,
    tasks: 23,
    color: "bg-primary/10 border-primary/20",
  },
  {
    name: "Mobile App Development",
    description: "Native iOS and Android app for customer portal",
    status: "Planning",
    progress: 25,
    dueDate: "Jan 20, 2025",
    team: 3,
    tasks: 45,
    color: "bg-warning/10 border-warning/20",
  },
  {
    name: "API Integration",
    description: "Connect third-party services and improve data flow",
    status: "Review",
    progress: 90,
    dueDate: "Dec 8, 2024",
    team: 2,
    tasks: 12,
    color: "bg-success/10 border-success/20",
  },
];

export default function Projects() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and track progress</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
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
              {/* Status and Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === 'In Progress' ? 'bg-primary/20 text-primary' :
                    project.status === 'Planning' ? 'bg-warning/20 text-warning' :
                    'bg-success/20 text-success'
                  }`}>
                    {project.status}
                  </span>
                  <span className="text-sm font-medium text-foreground">{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full">
                  <div 
                    className="h-2 bg-gradient-primary rounded-full transition-all" 
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {project.dueDate}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {project.team} members
                </div>
                <div>{project.tasks} tasks</div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Project Card */}
        <Card className="border-dashed border-2 border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
          <CardContent className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center space-y-2">
              <Plus className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="font-medium text-foreground">Create New Project</h3>
              <p className="text-sm text-muted-foreground">Start organizing your work</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Note about backend */}
      <Card className="bg-warning/10 border-warning/20">
        <CardContent className="p-4">
          <p className="text-sm text-warning-foreground">
            <strong>Next Step:</strong> To enable full project management functionality (creating, editing, and storing projects), 
            you'll need to connect to Supabase for backend data storage and user authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
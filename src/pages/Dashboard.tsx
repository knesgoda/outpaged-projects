import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, CheckCircle, Clock, Users } from "lucide-react";

const stats = [
  {
    title: "Active Projects",
    value: "12",
    description: "+2 this month",
    icon: TrendingUp,
    color: "text-primary",
  },
  {
    title: "Completed Tasks",
    value: "147",
    description: "+23 this week",
    icon: CheckCircle,
    color: "text-success",
  },
  {
    title: "Pending Tasks",
    value: "34",
    description: "Due this week",
    icon: Clock,
    color: "text-warning",
  },
  {
    title: "Team Members",
    value: "8",
    description: "Active contributors",
    icon: Users,
    color: "text-accent",
  },
];

const recentProjects = [
  { name: "Website Redesign", status: "In Progress", progress: 75, dueDate: "Dec 15" },
  { name: "Mobile App", status: "Planning", progress: 25, dueDate: "Jan 20" },
  { name: "API Integration", status: "Review", progress: 90, dueDate: "Dec 8" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your project overview.</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border bg-card hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Projects</CardTitle>
            <CardDescription>Your most active projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.name} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">{project.name}</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      project.status === 'In Progress' ? 'bg-primary/20 text-primary' :
                      project.status === 'Planning' ? 'bg-warning/20 text-warning' :
                      'bg-success/20 text-success'
                    }`}>
                      {project.status}
                    </span>
                    <span className="text-muted-foreground">Due {project.dueDate}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-foreground">{project.progress}%</div>
                  <div className="w-20 h-2 bg-muted rounded-full">
                    <div 
                      className="h-2 bg-gradient-primary rounded-full transition-all" 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start h-12">
              <Plus className="w-4 h-4 mr-3" />
              Create New Task
            </Button>
            <Button variant="outline" className="w-full justify-start h-12">
              <CheckCircle className="w-4 h-4 mr-3" />
              View Kanban Board
            </Button>
            <Button variant="outline" className="w-full justify-start h-12">
              <Users className="w-4 h-4 mr-3" />
              Invite Team Member
            </Button>
            <Button variant="outline" className="w-full justify-start h-12">
              <TrendingUp className="w-4 h-4 mr-3" />
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
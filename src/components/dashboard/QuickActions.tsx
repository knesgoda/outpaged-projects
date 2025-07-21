
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, CheckSquare, Users, Calendar, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "New Project",
      description: "Create a new project",
      icon: FolderOpen,
      action: () => navigate('/dashboard/projects'),
      color: "bg-blue-500"
    },
    {
      title: "Add Task",
      description: "Create a new task",
      icon: CheckSquare,
      action: () => navigate('/dashboard/tasks'),
      color: "bg-green-500"
    },
    {
      title: "View Team",
      description: "Manage team members",
      icon: Users,
      action: () => navigate('/dashboard/team'),
      color: "bg-purple-500"
    },
    {
      title: "Search",
      description: "Find projects and tasks",
      icon: Search,
      action: () => navigate('/dashboard/search'),
      color: "bg-orange-500"
    },
    {
      title: "Sprint Planning",
      description: "Plan your sprints",
      icon: Calendar,
      action: () => navigate('/dashboard/sprints'),
      color: "bg-indigo-500"
    },
    {
      title: "Settings",
      description: "Configure your workspace",
      icon: Settings,
      action: () => navigate('/dashboard/settings'),
      color: "bg-gray-500"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted/50"
              onClick={action.action}
            >
              <div className={`w-8 h-8 rounded-full ${action.color} flex items-center justify-center`}>
                <action.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Tasks() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">Manage and track all your tasks</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-10 bg-muted/30 border-muted focus:bg-background"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Coming Soon Message */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Task Management Coming Soon</h3>
            <p className="text-muted-foreground max-w-md">
              Advanced task management with assignments, due dates, comments, and status tracking 
              will be available once you connect to Supabase for backend functionality.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
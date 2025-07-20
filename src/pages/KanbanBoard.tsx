import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";

const columns = [
  { id: "todo", title: "To Do", count: 5 },
  { id: "inprogress", title: "In Progress", count: 3 },
  { id: "review", title: "Review", count: 2 },
  { id: "done", title: "Done", count: 8 },
];

export default function KanbanBoard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kanban Board</h1>
          <p className="text-muted-foreground">Visualize and manage task workflow</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-6">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                    {column.title}
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs">
                      {column.count}
                    </span>
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="w-6 h-6">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Placeholder for drag-and-drop tasks */}
                <div className="min-h-[400px] border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Task cards will appear here
                    </p>
                    <Button variant="ghost" size="sm" className="text-primary">
                      <Plus className="w-4 h-4 mr-1" />
                      Add task
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-foreground">
            <strong>Interactive Kanban Board:</strong> Drag-and-drop functionality, 
            task management, and real-time updates will be enabled with Supabase integration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
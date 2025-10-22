import { useState } from "react";
import { SwimlaneKanbanBoard } from "./SwimlaneKanbanBoard";
import type { SwimlaneMode } from "@/types/kanban";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Demo data for showcasing swimlane functionality
const DEMO_COLUMNS = [
  { id: 'backlog', name: 'Backlog', position: 0, color: '#6b7280' },
  { id: 'todo', name: 'To Do', position: 1, color: '#3b82f6' },
  { id: 'in_progress', name: 'In Progress', position: 2, color: '#f59e0b' },
  { id: 'review', name: 'Review', position: 3, color: '#8b5cf6' },
  { id: 'done', name: 'Done', position: 4, color: '#10b981' },
];

const DEMO_TASKS = [
  // Alice's tasks
  { id: '1', title: 'Design homepage', assignee_id: 'alice', assignee_name: 'Alice Johnson', priority: 'high', status: 'in_progress', story_points: 5, epic_id: 'website', epic_name: 'Website Redesign', project_id: 'proj1', project_name: 'Marketing Site' },
  { id: '2', title: 'Create mockups', assignee_id: 'alice', assignee_name: 'Alice Johnson', priority: 'medium', status: 'todo', story_points: 3, epic_id: 'website', epic_name: 'Website Redesign', project_id: 'proj1' },
  
  // Bob's tasks
  { id: '3', title: 'API integration', assignee_id: 'bob', assignee_name: 'Bob Smith', priority: 'critical', status: 'in_progress', story_points: 8, is_blocked: true, epic_id: 'api', epic_name: 'API Development', project_id: 'proj2', project_name: 'Backend Services' },
  { id: '4', title: 'Database schema', assignee_id: 'bob', assignee_name: 'Bob Smith', priority: 'high', status: 'review', story_points: 5, epic_id: 'api', epic_name: 'API Development', project_id: 'proj2' },
  
  // Carol's tasks
  { id: '5', title: 'Write documentation', assignee_id: 'carol', assignee_name: 'Carol White', priority: 'low', status: 'todo', story_points: 2, epic_id: 'docs', epic_name: 'Documentation', project_id: 'proj1' },
  { id: '6', title: 'Update README', assignee_id: 'carol', assignee_name: 'Carol White', priority: 'low', status: 'done', story_points: 1, epic_id: 'docs', epic_name: 'Documentation', project_id: 'proj1' },
  
  // Unassigned tasks
  { id: '7', title: 'Setup CI/CD', priority: 'high', status: 'backlog', story_points: 5, epic_id: 'infrastructure', epic_name: 'Infrastructure', project_id: 'proj2' },
  { id: '8', title: 'Security audit', priority: 'critical', status: 'backlog', story_points: 8, project_id: 'proj2' },
];

export function SwimlaneDemo() {
  const [tasks] = useState(DEMO_TASKS);
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>('assignee');
  const [customField, setCustomField] = useState<string>();

  const handleTaskMove = (taskId: string, toColumnId: string, toLaneValue: any) => {
    console.log('Task moved:', { taskId, toColumnId, toLaneValue });
    // In a real app, this would update the database
  };

  const handleSwimlaneConfigChange = (mode: SwimlaneMode, field?: string) => {
    setSwimlaneMode(mode);
    setCustomField(field);
  };

  return (
    <div className="h-screen flex flex-col p-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Swimlane Kanban Board Demo</CardTitle>
          <CardDescription>
            Interactive demo showcasing swimlane grouping. Try different grouping modes from the settings panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Current mode:</strong> {swimlaneMode}</p>
            <p><strong>Features:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Group by Assignee, Epic, Priority, Project, or Custom Field</li>
              <li>Collapsible lanes with metrics (task count, story points, blocked count)</li>
              <li>Drag and drop tasks between columns and lanes</li>
              <li>Automatic hiding of empty lanes</li>
              <li>Expedite lane support for urgent items</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 border rounded-lg overflow-hidden">
        <SwimlaneKanbanBoard
          tasks={tasks}
          columns={DEMO_COLUMNS}
          swimlaneMode={swimlaneMode}
          customField={customField}
          onTaskMove={handleTaskMove}
          onSwimlaneConfigChange={handleSwimlaneConfigChange}
        />
      </div>
    </div>
  );
}

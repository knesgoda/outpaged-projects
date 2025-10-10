import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableView } from "@/components/views/TableView";
import { SprintBoard } from "@/components/views/SprintBoard";
import { StoryMap } from "@/components/views/StoryMap";
import { CalendarView } from "@/components/views/CalendarView";
import { TimelineView } from "@/components/timeline/TimelineView";
import { WorkloadView } from "@/components/views/WorkloadView";
import { PlanningPoker } from "@/components/planning/PlanningPoker";
import { Table, Calendar, GitBranch, Map, GanttChart, Users, Sparkles } from "lucide-react";

// Mock data
const mockTasks = [
  {
    id: "1",
    title: "User Authentication System",
    hierarchy_level: "epic",
    task_type: "epic",
    status: "in_progress",
    priority: "high",
    story_points: 21,
    parent_id: null,
  },
  {
    id: "2",
    title: "Login Page",
    hierarchy_level: "story",
    task_type: "story",
    status: "done",
    priority: "high",
    story_points: 5,
    parent_id: "1",
    sprint_id: "sprint-1",
  },
  {
    id: "3",
    title: "Design login UI",
    hierarchy_level: "task",
    task_type: "task",
    status: "done",
    priority: "medium",
    story_points: 2,
    parent_id: "2",
    sprint_id: "sprint-1",
    due_date: "2025-10-05T00:00:00Z",
  },
  {
    id: "4",
    title: "Implement auth logic",
    hierarchy_level: "task",
    task_type: "task",
    status: "done",
    priority: "high",
    story_points: 3,
    parent_id: "2",
    sprint_id: "sprint-1",
  },
  {
    id: "5",
    title: "Registration Flow",
    hierarchy_level: "story",
    task_type: "story",
    status: "in_progress",
    priority: "medium",
    story_points: 8,
    parent_id: "1",
    sprint_id: "sprint-1",
  },
];

const mockSprints = [
  {
    id: "sprint-1",
    name: "Sprint 1",
    start_date: "2025-10-01",
    end_date: "2025-10-14",
    goal: "Complete authentication system",
    status: "active" as const,
  },
];

const mockParticipants = [
  { id: "current-user", name: "You" },
  { id: "user-2", name: "Alice" },
  { id: "user-3", name: "Bob" },
  { id: "user-4", name: "Charlie" },
];

export default function EnhancedViews() {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enhanced Project Views</h1>
        <p className="text-muted-foreground">
          Comprehensive views for planning, tracking, and managing your work
        </p>
      </div>

      <Tabs defaultValue="table" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            <span className="hidden sm:inline">Table</span>
          </TabsTrigger>
          <TabsTrigger value="sprint" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Sprint</span>
          </TabsTrigger>
          <TabsTrigger value="story-map" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Story Map</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <GanttChart className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="workload" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Workload</span>
          </TabsTrigger>
          <TabsTrigger value="poker" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Poker</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <TableView 
            tasks={mockTasks} 
            onTaskClick={setSelectedTask}
            showHierarchy={true}
          />
        </TabsContent>

        <TabsContent value="sprint">
          <SprintBoard 
            sprints={mockSprints} 
            tasks={mockTasks}
            onTaskClick={setSelectedTask}
          />
        </TabsContent>

        <TabsContent value="story-map">
          <StoryMap 
            tasks={mockTasks}
            onTaskClick={setSelectedTask}
          />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView 
            tasks={mockTasks}
            onTaskClick={setSelectedTask}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineView className="min-h-[400px]" height={"60vh"} projectId="enhanced-demo" />
        </TabsContent>

        <TabsContent value="workload">
          <WorkloadView />
        </TabsContent>

        <TabsContent value="poker">
          <PlanningPoker
            taskTitle="Implement OAuth 2.0 Integration"
            taskDescription="Add support for Google and GitHub OAuth providers with secure token management"
            participants={mockParticipants}
            onEstimateComplete={(estimate) => console.log("Estimate:", estimate)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

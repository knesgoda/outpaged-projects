import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectSelector } from "@/components/kanban/ProjectSelector";
import { PortfolioManager } from "@/components/portfolio/PortfolioManager";
import { GanttView } from "@/components/views/GanttView";
import { CalendarView } from "@/components/views/CalendarView";
import { CustomFieldsManager } from "@/components/custom-fields/CustomFieldsManager";
import { SLADashboard } from "@/components/sla/SLADashboard";
import { supabase } from "@/integrations/supabase/client";

const PortfolioPage = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assignees:task_assignees(
            user:profiles(full_name)
          )
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tasksWithAssignees = data?.map((task: any) => ({
        ...task,
        assignee_name: task.assignees?.[0]?.full_name || task.assignees?.[0]?.user?.full_name
      })) || [];

      setTasks(tasksWithAssignees);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  if (!projectId) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
          <p className="text-muted-foreground">
            Advanced portfolio management, planning, and tracking
          </p>
        </div>
        <ProjectSelector 
          onProjectSelect={(id) => {
            const newSearchParams = new URLSearchParams();
            newSearchParams.set('project', id);
            window.location.search = newSearchParams.toString();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
        <p className="text-muted-foreground">
          Advanced portfolio management, planning, and tracking
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
          <TabsTrigger value="sla">SLA Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PortfolioManager />
        </TabsContent>

        <TabsContent value="timeline">
          <GanttView tasks={tasks} />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView tasks={tasks} />
        </TabsContent>

        <TabsContent value="custom-fields">
          <CustomFieldsManager projectId={projectId} />
        </TabsContent>

        <TabsContent value="sla">
          <SLADashboard projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PortfolioPage;
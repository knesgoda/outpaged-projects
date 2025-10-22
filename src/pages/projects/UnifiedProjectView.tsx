import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectViewHeader } from "./ProjectViewHeader";
import { useProjectViewPreferences } from "@/hooks/useProjectViewPreferences";
import type { BoardViewMode } from "@/types/boards";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function UnifiedProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) throw new Error("Project ID required");

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { defaultView, setDefaultView, isLoading: prefsLoading } = 
    useProjectViewPreferences(projectId || "");

  // Get current view from URL
  const pathParts = location.pathname.split("/");
  const currentViewFromUrl = pathParts[pathParts.length - 1];
  const validViews = ["kanban", "table", "timeline", "calendar"];
  const currentView = validViews.includes(currentViewFromUrl) 
    ? (currentViewFromUrl as BoardViewMode)
    : defaultView;

  // Redirect to default view if on base project URL
  useEffect(() => {
    if (projectId && !prefsLoading && location.pathname === `/projects/${projectId}`) {
      navigate(`/projects/${projectId}/${defaultView}`, { replace: true });
    }
  }, [projectId, defaultView, prefsLoading, location.pathname, navigate]);

  const handleViewChange = async (view: BoardViewMode) => {
    if (!projectId) return;
    
    // Save preference
    await setDefaultView(view);
    
    // Navigate to new view
    navigate(`/projects/${projectId}/${view}`);
  };

  if (projectLoading || prefsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <ProjectViewHeader
        projectId={project.id}
        projectName={project.name}
        currentView={currentView}
        onViewChange={handleViewChange}
      />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

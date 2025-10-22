import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { useProject } from "@/contexts/ProjectContext";
import ProjectViewHeader from "./ProjectViewHeader";
import { useProjectViewPreferences } from "@/hooks/useProjectViewPreferences";
import type { BoardViewMode } from "@/types/boards";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function UnifiedProjectView() {
  const { project } = useProject();
  const navigate = useNavigate();
  const location = useLocation();

  const { defaultView, setDefaultView, isLoading: prefsLoading } = 
    useProjectViewPreferences(project.id);

  // Get current view from URL
  const pathParts = location.pathname.split("/");
  const currentViewFromUrl = pathParts[pathParts.length - 1];
  const validViews = ["kanban", "table", "timeline", "calendar"];
  const currentView = validViews.includes(currentViewFromUrl) 
    ? (currentViewFromUrl as BoardViewMode)
    : defaultView;

  // Redirect to default view if on base project URL
  const projectIdentifier = project.code || project.id;
  useEffect(() => {
    if (!prefsLoading && location.pathname === `/projects/${projectIdentifier}`) {
      navigate(`/projects/${projectIdentifier}/${defaultView}`, { replace: true });
    }
  }, [projectIdentifier, defaultView, prefsLoading, location.pathname, navigate]);

  const handleViewChange = async (view: BoardViewMode) => {
    // Save preference
    await setDefaultView(view);
    
    // Navigate to new view
    navigate(`/projects/${projectIdentifier}/${view}`);
  };

  if (prefsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <ProjectViewHeader
        projectId={projectIdentifier}
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

import { useEffect, useState } from "react";
import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { resolveProject, ProjectNavigationData } from "@/hooks/useProjectNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectProvider } from "@/contexts/ProjectContext";

export function ProjectResolver() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState<ProjectNavigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setError("No project identifier provided");
      setLoading(false);
      return;
    }

    resolveProject(projectId)
      .then((resolvedProject) => {
        if (resolvedProject) {
          setProject(resolvedProject);
          
          // Optional: Redirect UUID URLs to code-based URLs
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
          if (isUuid && resolvedProject.code) {
            const newPath = location.pathname.replace(
              `/projects/${projectId}`,
              `/projects/${resolvedProject.code}`
            );
            navigate(newPath, { replace: true });
          }
        } else {
          setError("Project not found");
        }
      })
      .catch((err) => {
        console.error("Error resolving project:", err);
        setError("Failed to load project");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectId, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-2">Project Not Found</h2>
        <p className="text-muted-foreground mb-4">{error || "The requested project could not be found."}</p>
        <button
          onClick={() => navigate('/projects')}
          className="text-primary hover:underline"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <ProjectProvider value={{ project, isLoading: false }}>
      <Outlet />
    </ProjectProvider>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resolveProject, ProjectNavigationData } from "@/hooks/useProjectNavigation";
import ProjectSettings from "@/pages/ProjectSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectId } from "@/hooks/useProjectId";

export function ProjectSettingsResolver() {
  const projectId = useProjectId();
  const { code } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectNavigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const identifier = code || projectId;
    if (!identifier) {
      setError("No project identifier provided");
      setLoading(false);
      return;
    }

    resolveProject(identifier)
      .then((resolvedProject) => {
        if (resolvedProject) {
          setProject(resolvedProject);
          
          // If accessed via UUID but has code, redirect to code-based URL
          if (projectId && resolvedProject.code) {
            navigate(`/dashboard/projects/code/${resolvedProject.code.toLowerCase()}/settings`, { replace: true });
            return;
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
  }, [projectId, code, navigate]);

  if (loading) {
    return (
      <div className="space-y-6">
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
          onClick={() => navigate('/dashboard/projects')}
          className="text-blue-600 hover:text-blue-800"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  // Set the resolved project ID in a way that ProjectSettings can access it
  return <ProjectSettings overrideProjectId={project.id} />;
}
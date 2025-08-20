import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectNavigationData {
  id: string;
  code?: string;
  name: string;
}

export function useProjectNavigation() {
  const navigate = useNavigate();

  const navigateToProject = (project: ProjectNavigationData) => {
    // Use code-based route if code exists, otherwise use UUID
    const route = project.code 
      ? `/dashboard/projects/code/${project.code.toLowerCase()}`
      : `/dashboard/projects/${project.id}`;
    navigate(route);
  };

  const navigateToProjectSettings = (project: ProjectNavigationData) => {
    const route = project.code 
      ? `/dashboard/projects/code/${project.code.toLowerCase()}/settings`
      : `/dashboard/projects/${project.id}/settings`;
    navigate(route);
  };

  const getProjectUrl = (project: ProjectNavigationData) => {
    return project.code 
      ? `/dashboard/projects/code/${project.code.toLowerCase()}`
      : `/dashboard/projects/${project.id}`;
  };

  const getProjectSettingsUrl = (project: ProjectNavigationData) => {
    return project.code 
      ? `/dashboard/projects/code/${project.code.toLowerCase()}/settings`
      : `/dashboard/projects/${project.id}/settings`;
  };

  return {
    navigateToProject,
    navigateToProjectSettings,
    getProjectUrl,
    getProjectSettingsUrl,
  };
}

// Utility function to resolve project by either UUID or code
export async function resolveProject(identifier: string): Promise<ProjectNavigationData | null> {
  try {
    // Check if identifier looks like a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    const { data, error } = await supabase
      .from('projects')
      .select('id, code, name')
      .eq(isUuid ? 'id' : 'code', isUuid ? identifier : identifier.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Error resolving project:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error resolving project:', error);
    return null;
  }
}
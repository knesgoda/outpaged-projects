import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectNavigationData {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
}

export function useProjectNavigation() {
  const navigate = useNavigate();

  const navigateToProjectSettings = (project: ProjectNavigationData | { id: string }) => {
    navigate(`/projects/${project.id}/settings`);
  };

  const navigateToProject = (projectIdOrProject: string | { id: string }, tab?: string) => {
    const projectId = typeof projectIdOrProject === 'string' ? projectIdOrProject : projectIdOrProject.id;
    if (tab && tab !== 'overview') {
      navigate(`/projects/${projectId}/${tab}`);
    } else {
      navigate(`/projects/${projectId}`);
    }
  };

  const getProjectUrl = (projectIdOrProject: string | { id: string; code?: string | null }, tab?: string) => {
    const projectId = typeof projectIdOrProject === 'string' ? projectIdOrProject : projectIdOrProject.id;
    if (tab && tab !== 'overview') {
      return `/projects/${projectId}/${tab}`;
    }
    return `/projects/${projectId}`;
  };

  return {
    navigateToProjectSettings,
    navigateToProject,
    getProjectUrl,
  };
}

export async function resolveProject(identifier: string): Promise<ProjectNavigationData | null> {
  try {
    // Try to find project by ID first
    let query = supabase
      .from('projects')
      .select('id, name, code, description')
      .eq('id', identifier)
      .maybeSingle();

    let { data, error } = await query;

    // If not found by ID and identifier looks like a code, try by code
    if (!data && !error && identifier.length < 36) {
      const codeQuery = supabase
        .from('projects')
        .select('id, name, code, description')
        .eq('code', identifier)
        .maybeSingle();

      const codeResult = await codeQuery;
      data = codeResult.data;
      error = codeResult.error;
    }

    if (error) {
      console.error('Error resolving project:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in resolveProject:', error);
    return null;
  }
}

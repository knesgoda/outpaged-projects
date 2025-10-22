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
    const identifier = 'code' in project && project.code ? project.code : project.id;
    navigate(`/projects/${identifier}/settings`);
  };

  const navigateToProject = (projectIdOrProject: string | { id: string; code?: string | null }, tab?: string) => {
    const identifier = typeof projectIdOrProject === 'string' 
      ? projectIdOrProject 
      : (projectIdOrProject.code || projectIdOrProject.id);
    
    if (tab && tab !== 'overview') {
      navigate(`/projects/${identifier}/${tab}`);
    } else {
      navigate(`/projects/${identifier}`);
    }
  };

  const getProjectUrl = (projectIdOrProject: string | { id: string; code?: string | null }, tab?: string) => {
    const identifier = typeof projectIdOrProject === 'string' 
      ? projectIdOrProject 
      : (projectIdOrProject.code || projectIdOrProject.id);
    
    if (tab && tab !== 'overview') {
      return `/projects/${identifier}/${tab}`;
    }
    return `/projects/${identifier}`;
  };

  const getTaskUrl = (project: { id: string; code?: string | null }, taskNumber: number, view: string = 'kanban') => {
    const identifier = project.code || project.id;
    const taskKey = project.code ? `${project.code}-${taskNumber}` : taskNumber.toString();
    return `/projects/${identifier}/${view}/${taskKey}`;
  };

  return {
    navigateToProjectSettings,
    navigateToProject,
    getProjectUrl,
    getTaskUrl,
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

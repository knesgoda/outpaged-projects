import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectNavigationData {
  id: string;
  code?: string | null;
  name: string;
}

const buildIdRoute = (projectId: string) => `/dashboard/projects/${projectId}`;

export function useProjectNavigation() {
  const navigate = useNavigate();

  const navigateToProject = (project: ProjectNavigationData) => {
    navigate(buildIdRoute(project.id));
  };

  const navigateToProjectSettings = (project: ProjectNavigationData) => {
    navigate(`${buildIdRoute(project.id)}/settings`);
  };

  const getProjectUrl = (project: ProjectNavigationData) => {
    return buildIdRoute(project.id);
  };

  const getProjectSettingsUrl = (project: ProjectNavigationData) => {
    return `${buildIdRoute(project.id)}/settings`;
  };

  const getTaskUrl = (project: ProjectNavigationData, taskNumber: number) => {
    return `${buildIdRoute(project.id)}/tasks/${taskNumber}`;
  };

  return {
    navigateToProject,
    navigateToProjectSettings,
    getProjectUrl,
    getProjectSettingsUrl,
    getTaskUrl,
  };
}

// Utility function to resolve project by either UUID or code
export async function resolveProject(identifier: string): Promise<ProjectNavigationData | null> {
  try {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      return null;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedIdentifier);

    const query = supabase
      .from('projects')
      .select('id, code, name');

    const { data, error } = await (isUuid
      ? query.eq('id', trimmedIdentifier)
      : query.ilike('code', trimmedIdentifier))
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
import { useParams } from "react-router-dom";

/**
 * Reads the project identifier from the current route while remaining backward compatible
 * with legacy :id params.
 */
export function useProjectId(): string | undefined {
  const { projectId, id } = useParams();
  return projectId ?? id;
}

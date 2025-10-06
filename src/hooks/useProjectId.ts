import { useParams } from "react-router-dom";

export function useProjectId(): string | undefined {
  const { projectId, id } = useParams<{ projectId?: string; id?: string }>();
  return projectId ?? id;
}

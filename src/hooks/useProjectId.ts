import { useParams } from "react-router-dom";

export function useProjectId(): string | undefined {
  const { projectId, id } = useParams();
  return projectId ?? id;
}

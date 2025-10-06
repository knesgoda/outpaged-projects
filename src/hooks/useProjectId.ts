import { useParams } from "react-router-dom";

export function useProjectId() {
  const params = useParams<{ projectId?: string; id?: string }>();
  return params.projectId ?? params.id;
}

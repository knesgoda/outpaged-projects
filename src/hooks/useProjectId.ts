import { useParams } from "react-router-dom";

type ProjectParamMap = {
  projectId?: string;
  id?: string;
};

export function useProjectId(): string | undefined {
  const params = useParams<ProjectParamMap>();
  return params.projectId ?? params.id;
}

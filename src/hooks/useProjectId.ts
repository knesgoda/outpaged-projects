import { useParams } from "react-router-dom";

codex/implement-people,-teams-and-time-tracking
type ProjectParamMap = {
  projectId?: string;
  id?: string;
};

export function useProjectId(): string | undefined {
  const params = useParams<ProjectParamMap>();
  return params.projectId ?? params.id;
}
export function useProjectId() {
  const params = useParams<{ projectId?: string; id?: string }>();
  return params.projectId ?? params.id;
export function useProjectId(): string | undefined {
  const { projectId, id } = useParams();
  return projectId ?? id;
}
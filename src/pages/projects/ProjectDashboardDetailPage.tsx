import { useParams } from "react-router-dom";
import { DashboardDetailView } from "@/pages/dashboards/DashboardDetailView";

export default function ProjectDashboardDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <DashboardDetailView projectIdFromRoute={projectId} />;
}

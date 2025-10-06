import { useParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoalDetailView } from "@/pages/goals/GoalDetail";

export default function ProjectGoalDetail() {
  const { projectId, goalId } = useParams<{ projectId: string; goalId: string }>();

  if (!projectId || !goalId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Goal not found.</AlertDescription>
      </Alert>
    );
  }

  return <GoalDetailView goalId={goalId} projectId={projectId} />;
}

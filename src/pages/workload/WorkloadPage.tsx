import { useEffect } from "react";
import { PageTemplate } from "../ia/PageTemplate";
import { WorkloadDashboard } from "@/components/workload/WorkloadDashboard";

export default function WorkloadPage() {
  useEffect(() => {
    document.title = "Workload • Outpaged";
  }, []);

  return (
    <PageTemplate
      title="Workload"
      description="Balance assignments across people and teams to prevent burnout."
    >
      <WorkloadDashboard allowProjectSelection />
    </PageTemplate>
  );
}

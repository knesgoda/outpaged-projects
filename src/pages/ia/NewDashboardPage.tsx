import { PageTemplate } from "./PageTemplate";

export default function NewDashboardPage() {
  return (
    <PageTemplate
      title="New Dashboard"
      description="Assemble widgets and data sources to monitor performance."
      featureFlag="dashboards"
    />
  );
}

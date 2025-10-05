import { PageTemplate } from "./PageTemplate";

export default function TimeTrackingPage() {
  return (
    <PageTemplate
      title="Time Tracking"
      description="Capture billable and non-billable time with timers and timesheets."
      featureFlag="timeTracking"
    />
  );
}

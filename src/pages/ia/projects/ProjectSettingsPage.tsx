import { ProjectPageTemplate } from "./ProjectPageTemplate";
import { NotificationSchemeSettings } from "@/features/projects/settings/NotificationSchemeSettings";
import { SLASettingsPanel } from "@/features/projects/settings/SLASettingsPanel";

export default function ProjectSettingsPage() {
  return (
    <ProjectPageTemplate
      title="Settings"
      description="Manage notifications, SLA policies, and metadata for this project."
    >
      {({ projectId }) => (
        <div className="space-y-6">
          <NotificationSchemeSettings projectId={projectId} />
          <SLASettingsPanel projectId={projectId} />
        </div>
      )}
    </ProjectPageTemplate>
  );
}

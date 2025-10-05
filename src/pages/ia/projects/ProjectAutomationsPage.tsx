import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { Button } from "@/components/ui/button";
import { ProjectPageTemplate } from "./ProjectPageTemplate";

export default function ProjectAutomationsPage() {
  if (!FEATURE_FLAGS.automations) {
    return (
      <ProjectPageTemplate
        title="Automations"
        description="Create rules to automate repetitive work and keep teams aligned."
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold">Feature disabled</h2>
          <p className="mt-2 text-muted-foreground">
            Automations are turned off for this workspace. Ask your admin to enable them.
          </p>
          <Button className="mt-4" variant="outline">
            Contact admin
          </Button>
        </div>
      </ProjectPageTemplate>
    );
  }

  return (
    <ProjectPageTemplate
      title="Automations"
      description="Create rules to automate repetitive work and keep teams aligned."
    />
  );
}

import { ReactNode } from "react";
import { useProjectId } from "@/hooks/useProjectId";
import { TabBar } from "@/components/common/TabBar";

interface ProjectPageTemplateProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function ProjectPageTemplate({ title, description, children }: ProjectPageTemplateProps) {
  const projectId = useProjectId();

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
        <p className="text-sm text-muted-foreground">
          Project reference: {projectId ?? "Unknown project"}
        </p>
      </header>
      <TabBar />
      <div className="rounded-lg border bg-background p-6 text-muted-foreground">
        {children ?? "Content for this view is coming soon."}
      </div>
    </section>
  );
}

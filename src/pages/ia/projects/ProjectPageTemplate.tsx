import { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { TabBar } from "@/components/common/TabBar";
import { Button } from "@/components/ui/button";
import { useCommandK } from "@/components/command/useCommandK";

interface ProjectPageTemplateProps {
  title: string;
  description: string;
  children?: ReactNode;
  headerExtras?: ReactNode;
}

export function ProjectPageTemplate({ title, description, children, headerExtras }: ProjectPageTemplateProps) {
  const { projectId } = useParams();
  const { openPalette } = useCommandK();

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Project reference: {projectId ?? "Unknown"}</span>
          {projectId ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openPalette({ projectId })}
            >
              Search in project
            </Button>
          ) : null}
          {headerExtras}
        </div>
        {/* TODO: Replace reference with actual project name */}
      </header>
      <TabBar />
      <div className="rounded-lg border bg-background p-6 text-muted-foreground">
        {children ?? "Content for this view is coming soon."}
      </div>
    </section>
  );
}

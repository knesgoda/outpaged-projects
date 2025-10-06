import { ReactNode } from "react";
codex/implement-global-search-and-command-k-palette
import TabBar from "@/components/common/TabBar";
import { TabBar } from "@/components/common/TabBar";
import { useProjectId } from "@/hooks/useProjectId";

interface ProjectPageTemplateProps {
  title: string;
  description: string;
  children?: ReactNode;
  headerExtras?: ReactNode;
}
export function ProjectPageTemplate({
  title,
  description,
  children,
  headerExtras,
}: ProjectPageTemplateProps) {
  const projectId = useProjectId();

  const openCommandPalette = () => {
    if (!projectId) return;
    document.dispatchEvent(
      new CustomEvent("open-command-palette", { detail: { projectId } })
    );
  };
export function ProjectPageTemplate({ title, description, children }: ProjectPageTemplateProps) {
  const projectId = useProjectId()

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
            <button
              type="button"
              onClick={openCommandPalette}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              title="Search in project"
              aria-label="Search in project"
            >
              Search in project
            </button>
          ) : null}
          {headerExtras}
        </div>
      </header>

      <TabBar />

      <div className="rounded-lg border bg-background p-6 text-muted-foreground">
        {children ?? "Content for this view is coming soon."}
      </div>
    </section>
  );
}

import { Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { TimelineView } from "@/components/timeline/TimelineView";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

import { ProjectPageTemplate } from "./ProjectPageTemplate";

export default function ProjectTimelinePage() {
  const [searchParams] = useSearchParams();

  const { savedViewId, filters } = useMemo(() => {
    const viewId = searchParams.get("viewId") ?? undefined;
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key === "viewId") {
        return;
      }
      result[key] = value;
    });

    return {
      savedViewId: viewId,
      filters: result,
    };
  }, [searchParams]);

  return (
    <ProjectPageTemplate
      title="Timeline"
      description="Track sequences of work and surface risks before they impact delivery."
    >
      {({ projectId }) => (
        <ErrorBoundary fallback={<Skeleton className="h-[520px] w-full" />}>
          <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
            <TimelineView
              className="min-h-[520px]"
              height="70vh"
              projectId={projectId}
              savedViewId={savedViewId}
              filters={{ ...filters, projectId }}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </ProjectPageTemplate>
  );
}

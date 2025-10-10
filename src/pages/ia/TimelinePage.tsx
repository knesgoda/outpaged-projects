import { Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { TimelineView } from "@/components/timeline/TimelineView";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

import { PageTemplate } from "./PageTemplate";

function TimelinePageContent() {
  const [searchParams] = useSearchParams();

  const { projectId, savedViewId, filters } = useMemo(() => {
    const project = searchParams.get("projectId") ?? undefined;
    const viewId = searchParams.get("viewId") ?? undefined;
    const result: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key === "projectId" || key === "viewId") {
        return;
      }
      result[key] = value;
    });

    return {
      projectId: project,
      savedViewId: viewId,
      filters: result,
    };
  }, [searchParams]);

  return (
    <TimelineView
      className="min-h-[520px]"
      height="70vh"
      projectId={projectId}
      savedViewId={savedViewId ?? undefined}
      filters={filters}
    />
  );
}

export default function TimelinePage() {
  return (
    <PageTemplate
      title="Timeline"
      description="Understand cross-project delivery and highlight key phases and risks."
    >
      <ErrorBoundary fallback={<Skeleton className="h-[520px] w-full" />}>
        <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
          <TimelinePageContent />
        </Suspense>
      </ErrorBoundary>
    </PageTemplate>
  );
}

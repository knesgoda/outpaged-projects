import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ApprovalsPage() {
  useDocumentTitle("Time / Approvals");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Pending submissions</p>
        <p className="text-sm text-muted-foreground">Managers will review and approve time periods here.</p>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 w-full animate-pulse rounded-md bg-muted/50" aria-hidden="true" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">No submissions yet. This view updates once time periods are sent for approval.</p>
    </div>
  );
}

import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function MyTimePage() {
  useDocumentTitle("Time / My");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">This week</p>
          <p className="text-sm text-muted-foreground">We will load your tracked time and timers here.</p>
        </div>
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted/60" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-12 w-full animate-pulse rounded-md bg-muted/50" aria-hidden="true" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Timesheet entry and submission actions are coming soon.</p>
    </div>
  );
}

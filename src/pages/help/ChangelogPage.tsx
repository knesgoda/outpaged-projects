import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { AnnouncementItem } from "@/components/help/AnnouncementItem";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function ChangelogPage() {
  const {
    data: announcements = [],
    isLoading,
    isError,
    error,
  } = useAnnouncements();
  const [fallbackContent, setFallbackContent] = useState<string | null>(null);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);

  useEffect(() => {
    if (!isLoading && announcements.length === 0 && fallbackContent === null && !isFetchingFallback) {
      setIsFetchingFallback(true);
      fetch("/CHANGELOG.md")
        .then((response) => {
          if (!response.ok) {
            throw new Error("CHANGELOG not found");
          }
          return response.text();
        })
        .then((text) => {
          setFallbackContent(text);
        })
        .catch(() => {
          setFallbackError("No changelog entries are available yet.");
        })
        .finally(() => setIsFetchingFallback(false));
    }
  }, [announcements, fallbackContent, isFetchingFallback, isLoading]);

  const hasAnnouncements = announcements.length > 0;

  return (
    <div className="space-y-8 p-6">
      <Helmet>
        <title>Help / Changelog</title>
      </Helmet>
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
        <p className="max-w-2xl text-muted-foreground">Follow the latest releases, improvements, and fixes.</p>
      </header>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load announcements</AlertTitle>
          <AlertDescription>
            {(error as Error | undefined)?.message ?? "Announcements are unavailable right now."}
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && hasAnnouncements && (
        <div className="grid gap-4 md:grid-cols-2">
          {announcements.map((announcement) => (
            <AnnouncementItem key={announcement.id} announcement={announcement} />
          ))}
        </div>
      )}

      {!isLoading && !hasAnnouncements && fallbackContent && (
        <article className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Latest updates</h2>
          <pre className="mt-4 max-h-[70vh] overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">
            {fallbackContent}
          </pre>
        </article>
      )}

      {!isLoading && !hasAnnouncements && !fallbackContent && fallbackError && (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">{fallbackError}</div>
      )}
    </div>
  );
}

export default ChangelogPage;

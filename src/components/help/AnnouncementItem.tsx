import type { Announcement } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatPublished(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch (_error) {
    return value;
  }
}

type AnnouncementItemProps = {
  announcement: Announcement;
  className?: string;
};

export function AnnouncementItem({ announcement, className }: AnnouncementItemProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {announcement.version && <span className="font-medium">Version {announcement.version}</span>}
          <span aria-hidden="true">•</span>
          <span>Published {formatPublished(announcement.published_at)}</span>
        </div>
        <CardTitle className="text-lg">{announcement.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {(announcement.body_markdown ?? "").replace(/[#*_`>\-]/g, " ").slice(0, 260)}
        </p>
      </CardContent>
    </Card>
  );
}

import { useParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function ProfilePage() {
  const { userId = "" } = useParams();
  useDocumentTitle(`People / ${userId || "Member"}`);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Member</h1>
        <p className="text-sm text-muted-foreground">Profile setup is in progress.</p>
      </header>
      <div className="rounded-lg border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-muted/60" aria-hidden="true" />
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted/60" aria-hidden="true" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted/60" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-6 space-y-3 text-sm text-muted-foreground">
          <p>We will load profile details for user {userId || "soon"}.</p>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-4 w-full animate-pulse rounded bg-muted/40" aria-hidden="true" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { ReactNode } from "react";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PageTemplateProps {
  title: string;
  description: string;
  featureFlag?: keyof typeof FEATURE_FLAGS;
  children?: ReactNode;
}

export function PageTemplate({ title, description, featureFlag, children }: PageTemplateProps) {
  const isDisabled = featureFlag ? !FEATURE_FLAGS[featureFlag] : false;

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      {isDisabled ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h2 className="text-xl font-semibold">Feature disabled</h2>
          <p className="mt-2 text-muted-foreground">
            This area is not available right now. Contact your admin if you need access.
          </p>
          <Button className="mt-4" variant="outline">
            Contact admin
          </Button>
        </div>
      ) : (
        <div className={cn("rounded-lg border bg-background p-6", children ? "space-y-4" : "text-muted-foreground")}>
          {children ?? "We are putting the finishing touches on this experience."}
        </div>
      )}
    </section>
  );
}

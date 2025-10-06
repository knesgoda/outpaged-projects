import { ReactNode } from "react";

interface ProjectPageTemplateProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function ProjectPageTemplate({ title, description, children }: ProjectPageTemplateProps) {
  return (
    <section className="flex flex-col gap-4">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </header>
      <div className="rounded-lg border bg-background p-6 text-muted-foreground">
        {children ?? "Content for this view is coming soon."}
      </div>
    </section>
  );
}

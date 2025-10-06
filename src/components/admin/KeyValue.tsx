import { ReactNode } from "react";

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
